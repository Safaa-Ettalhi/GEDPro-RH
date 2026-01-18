import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Interview } from './entities/interview.entity';
import { Candidate } from '../candidates/entities/candidate.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { UserOrganization } from '../organizations/entities/user-organization.entity';
import { User } from '../auth/entities/user.entity';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';
import { Role } from '../common/enums/role.enum';
import { InterviewStatus } from '../common/enums/interview-status.enum';
import { CandidateState } from '../common/enums/candidate-state.enum';
import { CandidatesService } from '../candidates/candidates.service';
import { GoogleCalendarService } from './services/google-calendar.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../common/enums/notification-type.enum';

@Injectable()
export class InterviewsService {
  private readonly logger = new Logger(InterviewsService.name);

  constructor(
    @InjectRepository(Interview)
    private interviewRepository: Repository<Interview>,
    @InjectRepository(Candidate)
    private candidateRepository: Repository<Candidate>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(UserOrganization)
    private userOrganizationRepository: Repository<UserOrganization>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private candidatesService: CandidatesService,
    private googleCalendarService: GoogleCalendarService,
    private notificationsService: NotificationsService,
  ) {}

  private async checkOrganizationAccess(
    organizationId: number,
    userId: number,
    requiredRoles: Role[] = [Role.ADMIN, Role.RH, Role.MANAGER, Role.CANDIDATE],
  ): Promise<UserOrganization> {
    const userOrg = await this.userOrganizationRepository.findOne({
      where: { organizationId, userId },
    });

    if (!userOrg) {
      throw new ForbiddenException(
        "Vous n'appartenez pas à cette organisation",
      );
    }

    const userRole = String(userOrg.role).trim().toLowerCase();
    const hasPermission = requiredRoles.some(
      (role) => String(role).trim().toLowerCase() === userRole,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Vous devez avoir le rôle ${requiredRoles.join(' ou ')} pour effectuer cette action`,
      );
    }

    return userOrg;
  }

  async create(
    createInterviewDto: CreateInterviewDto,
    organizationId: number,
    userId: number,
  ): Promise<Interview> {
    await this.checkOrganizationAccess(organizationId, userId, [
      Role.ADMIN,
      Role.RH,
    ]);

    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organisation introuvable');
    }

    const candidate = await this.candidateRepository.findOne({
      where: { id: createInterviewDto.candidateId, organizationId },
    });

    if (!candidate) {
      throw new NotFoundException(
        "Candidat introuvable ou n'appartient pas à cette organisation",
      );
    }

    let normalizedDate = createInterviewDto.date;
    if (!normalizedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const parts = normalizedDate.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const month = parts[1].padStart(2, '0');
        const day = parts[2].padStart(2, '0');
        normalizedDate = `${year}-${month}-${day}`;
      }
    }

    const interviewDate = new Date(
      `${normalizedDate}T${createInterviewDto.startTime}`,
    );

    if (isNaN(interviewDate.getTime())) {
      throw new BadRequestException('Format de date ou heure invalide');
    }

    if (interviewDate < new Date()) {
      throw new BadRequestException(
        "La date de l'entretien ne peut pas être dans le passé",
      );
    }
    const creatorUser = await this.userRepository.findOne({
      where: { id: userId },
    });
    const creatorUserOrg = await this.userOrganizationRepository.findOne({
      where: { userId, organizationId },
    });
    const creatorRole = creatorUserOrg?.role || creatorUser?.role;

    let participantIds = createInterviewDto.participantIds || [];

    if (creatorRole === Role.RH || creatorRole === Role.ADMIN) {
      if (!participantIds.includes(userId)) {
        participantIds = [...participantIds, userId];
      }
    }

    if (participantIds.length > 0) {
      for (const participantId of participantIds) {
        const participant = await this.userRepository.findOne({
          where: { id: participantId },
        });
        if (!participant) {
          throw new NotFoundException(
            `Participant avec l'ID ${participantId} introuvable`,
          );
        }
      }
    }

    const interview = this.interviewRepository.create({
      ...createInterviewDto,
      candidateId: createInterviewDto.candidateId,
      organizationId,
      createdBy: userId,
      participantIds: participantIds.length > 0 ? participantIds : undefined,
      date: new Date(createInterviewDto.date),
      status: InterviewStatus.PLANNED,
    });

    const savedInterview = await this.interviewRepository.save(interview);

    if (candidate.state !== CandidateState.ENTRETIEN_PLANIFIE) {
      try {
        await this.candidatesService.changeState(
          candidate.id,
          {
            newState: CandidateState.ENTRETIEN_PLANIFIE,
            comment: `Entretien planifié: ${savedInterview.title}`,
          },
          organizationId,
          userId,
        );
        this.logger.log(
          `État du candidat ${candidate.id} changé en ENTRETIEN_PLANIFIE`,
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Erreur inconnue';
        this.logger.warn(
          `Impossible de changer l'état du candidat: ${errorMessage}`,
        );
      }
    }

    if (this.googleCalendarService.isConfigured()) {
      try {
        const participants: User[] = [];
        if (
          createInterviewDto.participantIds &&
          createInterviewDto.participantIds.length > 0
        ) {
          for (const participantId of createInterviewDto.participantIds) {
            const participant = await this.userRepository.findOne({
              where: { id: participantId },
            });
            if (participant) {
              participants.push(participant);
            }
          }
        }

        const eventId = await this.googleCalendarService.createEvent(
          savedInterview,
          {
            firstName: candidate.firstName,
            lastName: candidate.lastName,
            email: candidate.email,
          },
          participants,
        );

        if (eventId) {
          savedInterview.calendarEventId = eventId;
          await this.interviewRepository.save(savedInterview);
          this.logger.log(
            `Événement Google Calendar créé pour l'entretien ${savedInterview.id}`,
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Erreur inconnue';
        this.logger.error(
          `Erreur lors de la création de l'événement Google Calendar: ${errorMessage}`,
        );
      }
    }

    try {
      const participants: User[] = [];
      if (
        createInterviewDto.participantIds &&
        createInterviewDto.participantIds.length > 0
      ) {
        for (const participantId of createInterviewDto.participantIds) {
          const participant = await this.userRepository.findOne({
            where: { id: participantId },
          });
          if (participant) {
            participants.push(participant);
          }
        }
      }

      const userIds = participants
        .map((p) => p.id)
        .filter((id): id is number => id !== undefined && id !== userId);

      if (userIds.length > 0) {
        await this.notificationsService.createAndSend(
          NotificationType.INTERVIEW_PLANNED,
          'Entretien planifié',
          `Entretien "${savedInterview.title}" avec ${candidate.firstName} ${candidate.lastName} le ${savedInterview.date.toLocaleDateString('fr-FR')} à ${savedInterview.startTime}`,
          organizationId,
          userIds,
          {
            candidateId: candidate.id,
            interviewId: savedInterview.id,
          },
        );
      }

      const candidateUser = await this.userRepository.findOne({
        where: { email: candidate.email },
      });

      this.logger.log(
        `[CREATE INTERVIEW] Recherche utilisateur pour email: ${candidate.email}, trouvé: ${candidateUser ? `Oui (ID: ${candidateUser.id})` : 'Non'}`,
      );

      if (candidateUser) {
        const interviewDate = new Date(savedInterview.date);
        const formattedDate = interviewDate.toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });

        this.logger.log(
          `[CREATE INTERVIEW] Envoi notification entretien planifié au candidat ${candidateUser.id}`,
        );
        await this.notificationsService.createAndSend(
          NotificationType.INTERVIEW_PLANNED,
          'Entretien planifié',
          `Un entretien "${savedInterview.title}" a été planifié pour vous le ${formattedDate} à ${savedInterview.startTime}${savedInterview.location ? ` à ${savedInterview.location}` : ''}${savedInterview.meetingLink ? `. Lien de visioconférence : ${savedInterview.meetingLink}` : ''}`,
          organizationId,
          [candidateUser.id],
          {
            candidateId: candidate.id,
            interviewId: savedInterview.id,
          },
        );
      } else {
        this.logger.warn(
          `[CREATE INTERVIEW] Aucun utilisateur trouvé pour l'email ${candidate.email}. Notification non envoyée.`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.warn(
        `Erreur lors de l'envoi de la notification d'entretien planifié: ${errorMessage}`,
      );
    }

    return this.findOne(savedInterview.id, organizationId, userId);
  }

  async findAll(
    organizationId: number,
    userId: number,
    filters?: {
      candidateId?: number;
      status?: InterviewStatus;
      dateFrom?: Date;
      dateTo?: Date;
    },
  ): Promise<Interview[]> {
    await this.checkOrganizationAccess(organizationId, userId);

    const queryBuilder = this.interviewRepository
      .createQueryBuilder('interview')
      .leftJoinAndSelect('interview.candidate', 'candidate')
      .leftJoinAndSelect('interview.createdByUser', 'createdByUser')
      .where('interview.organizationId = :organizationId', { organizationId });

    if (filters?.candidateId) {
      queryBuilder.andWhere('interview.candidateId = :candidateId', {
        candidateId: filters.candidateId,
      });
    }

    if (filters?.status) {
      queryBuilder.andWhere('interview.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.dateFrom) {
      queryBuilder.andWhere('interview.date >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    }

    if (filters?.dateTo) {
      queryBuilder.andWhere('interview.date <= :dateTo', {
        dateTo: filters.dateTo,
      });
    }

    return queryBuilder
      .orderBy('interview.date', 'ASC')
      .addOrderBy('interview.startTime', 'ASC')
      .getMany();
  }

  async findOne(
    id: number,
    organizationId: number,
    userId: number,
  ): Promise<Interview> {
    await this.checkOrganizationAccess(organizationId, userId);

    const interview = await this.interviewRepository
      .createQueryBuilder('interview')
      .leftJoinAndSelect('interview.candidate', 'candidate')
      .leftJoinAndSelect('interview.createdByUser', 'createdByUser')
      .where('interview.id = :id', { id })
      .andWhere('interview.organizationId = :organizationId', {
        organizationId,
      })
      .getOne();

    if (!interview) {
      throw new NotFoundException('Entretien introuvable');
    }

    return interview;
  }

  async update(
    id: number,
    updateInterviewDto: UpdateInterviewDto,
    organizationId: number,
    userId: number,
  ): Promise<Interview> {
    await this.checkOrganizationAccess(organizationId, userId, [
      Role.ADMIN,
      Role.MANAGER,
    ]);

    const interview = await this.interviewRepository.findOne({
      where: { id, organizationId },
    });

    if (!interview) {
      throw new NotFoundException('Entretien introuvable');
    }

    if (updateInterviewDto.date || updateInterviewDto.startTime) {
      let dateStr: string;
      if (updateInterviewDto.date) {
        dateStr = updateInterviewDto.date;
        if (!dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const parts = dateStr.split('-');
          if (parts.length === 3) {
            const year = parts[0];
            const month = parts[1].padStart(2, '0');
            const day = parts[2].padStart(2, '0');
            dateStr = `${year}-${month}-${day}`;
          }
        }
      } else {
        dateStr = interview.date.toISOString().split('T')[0];
      }

      const startTime = updateInterviewDto.startTime || interview.startTime;
      const interviewDate = new Date(`${dateStr}T${startTime}`);

      if (isNaN(interviewDate.getTime())) {
        throw new BadRequestException('Format de date ou heure invalide');
      }

      if (interviewDate < new Date()) {
        throw new BadRequestException(
          "La date de l'entretien ne peut pas être dans le passé",
        );
      }
    }

    if (updateInterviewDto.participantIds) {
      for (const participantId of updateInterviewDto.participantIds) {
        const participant = await this.userRepository.findOne({
          where: { id: participantId },
        });
        if (!participant) {
          throw new NotFoundException(
            `Participant avec l'ID ${participantId} introuvable`,
          );
        }
      }
    }

    if (
      updateInterviewDto.status &&
      !updateInterviewDto.date &&
      !updateInterviewDto.startTime
    ) {
      const interviewDate =
        interview.date instanceof Date
          ? interview.date
          : new Date(interview.date);
      const dateStr = interviewDate.toISOString().split('T')[0];
      const interviewDateTime = new Date(`${dateStr}T${interview.startTime}`);

      if (interviewDateTime < new Date()) {
        updateInterviewDto.status = InterviewStatus.COMPLETED;
      }
    }

    Object.assign(interview, {
      ...updateInterviewDto,
      date: updateInterviewDto.date
        ? new Date(updateInterviewDto.date)
        : interview.date,
    });

    const previousDate = interview.date;
    const previousStartTime = interview.startTime;
    const dateChanged =
      updateInterviewDto.date &&
      (previousDate instanceof Date
        ? previousDate.toISOString().split('T')[0]
        : previousDate) !== updateInterviewDto.date;
    const timeChanged =
      updateInterviewDto.startTime &&
      updateInterviewDto.startTime !== previousStartTime;

    await this.interviewRepository.save(interview);

    if (
      this.googleCalendarService.isConfigured() &&
      interview.calendarEventId
    ) {
      try {
        const candidate = await this.candidateRepository.findOne({
          where: { id: interview.candidateId },
        });

        if (candidate) {
          const participants: User[] = [];
          const participantIds =
            updateInterviewDto.participantIds || interview.participantIds || [];
          for (const participantId of participantIds) {
            const participant = await this.userRepository.findOne({
              where: { id: participantId },
            });
            if (participant) {
              participants.push(participant);
            }
          }

          await this.googleCalendarService.updateEvent(
            interview.calendarEventId,
            interview,
            {
              firstName: candidate.firstName,
              lastName: candidate.lastName,
              email: candidate.email,
            },
            participants,
          );
          this.logger.log(
            `Événement Google Calendar mis à jour pour l'entretien ${interview.id}`,
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Erreur inconnue';
        this.logger.error(
          `Erreur lors de la mise à jour de l'événement Google Calendar: ${errorMessage}`,
        );
      }
    }

    try {
      const candidate = await this.candidateRepository.findOne({
        where: { id: interview.candidateId },
      });

      if (candidate) {
        if (dateChanged || timeChanged) {
          const candidateUser = await this.userRepository.findOne({
            where: { email: candidate.email },
          });

          this.logger.log(
            `[UPDATE INTERVIEW] Recherche utilisateur pour email: ${candidate.email}, trouvé: ${candidateUser ? `Oui (ID: ${candidateUser.id})` : 'Non'}, dateChanged: ${dateChanged}, timeChanged: ${timeChanged}`,
          );

          if (candidateUser) {
            const interviewDate =
              interview.date instanceof Date
                ? interview.date
                : new Date(interview.date);
            const formattedDate = interviewDate.toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            });

            this.logger.log(
              `[UPDATE INTERVIEW] Envoi notification date modifiée au candidat ${candidateUser.id}`,
            );
            await this.notificationsService.createAndSend(
              NotificationType.INTERVIEW_UPDATED,
              "Date de l'entretien modifiée",
              `La date de votre entretien "${interview.title}" a été modifiée. Nouvelle date : ${formattedDate} à ${interview.startTime}${interview.location ? ` à ${interview.location}` : ''}${interview.meetingLink ? `. Lien de visioconférence : ${interview.meetingLink}` : ''}`,
              organizationId,
              [candidateUser.id],
              {
                candidateId: candidate.id,
                interviewId: interview.id,
              },
            );
          } else {
            this.logger.warn(
              `[UPDATE INTERVIEW] Aucun utilisateur trouvé pour l'email ${candidate.email}. Notification non envoyée.`,
            );
          }
        }

        // Notifier les participants
        const participants: User[] = [];
        const participantIds =
          updateInterviewDto.participantIds || interview.participantIds || [];
        for (const participantId of participantIds) {
          const participant = await this.userRepository.findOne({
            where: { id: participantId },
          });
          if (participant) {
            participants.push(participant);
          }
        }

        const userIds = participants
          .map((p) => p.id)
          .filter((id): id is number => id !== undefined && id !== userId);

        if (userIds.length > 0) {
          await this.notificationsService.createAndSend(
            NotificationType.INTERVIEW_UPDATED,
            'Entretien modifié',
            `L'entretien "${interview.title}" avec ${candidate.firstName} ${candidate.lastName} a été modifié`,
            organizationId,
            userIds,
            {
              candidateId: candidate.id,
              interviewId: interview.id,
            },
          );
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.warn(
        `Erreur lors de l'envoi de la notification d'entretien modifié: ${errorMessage}`,
      );
    }

    return this.findOne(id, organizationId, userId);
  }

  async remove(
    id: number,
    organizationId: number,
    userId: number,
  ): Promise<{ message: string }> {
    await this.checkOrganizationAccess(organizationId, userId, [
      Role.ADMIN,
      Role.MANAGER,
    ]);

    const interview = await this.interviewRepository.findOne({
      where: { id, organizationId },
      relations: ['candidate'],
    });

    if (!interview) {
      throw new NotFoundException('Entretien introuvable');
    }

    if (
      this.googleCalendarService.isConfigured() &&
      interview.calendarEventId
    ) {
      try {
        await this.googleCalendarService.deleteEvent(interview.calendarEventId);
        this.logger.log(
          `Événement Google Calendar supprimé pour l'entretien ${interview.id}`,
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Erreur inconnue';
        this.logger.error(
          `Erreur lors de la suppression de l'événement Google Calendar: ${errorMessage}`,
        );
      }
    }

    try {
      const candidate = interview.candidate;
      if (candidate) {
        const participants: User[] = [];
        if (interview.participantIds && interview.participantIds.length > 0) {
          for (const participantId of interview.participantIds) {
            const participant = await this.userRepository.findOne({
              where: { id: participantId },
            });
            if (participant) {
              participants.push(participant);
            }
          }
        }

        const userIds = participants
          .map((p) => p.id)
          .filter((id): id is number => id !== undefined && id !== userId);

        if (userIds.length > 0) {
          await this.notificationsService.createAndSend(
            NotificationType.INTERVIEW_CANCELLED,
            'Entretien annulé',
            `L'entretien "${interview.title}" avec ${candidate.firstName} ${candidate.lastName} a été annulé`,
            organizationId,
            userIds,
            {
              candidateId: candidate.id,
              interviewId: interview.id,
            },
          );
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.warn(
        `Erreur lors de l'envoi de la notification d'entretien annulé: ${errorMessage}`,
      );
    }

    await this.interviewRepository.remove(interview);

    return { message: 'Entretien supprimé avec succès' };
  }

  async getCandidateInterviews(
    candidateId: number,
    organizationId: number,
    userId: number,
  ): Promise<Interview[]> {
    await this.checkOrganizationAccess(organizationId, userId);

    const candidate = await this.candidateRepository.findOne({
      where: { id: candidateId, organizationId },
    });

    if (!candidate) {
      throw new NotFoundException('Candidat introuvable');
    }

    return this.interviewRepository.find({
      where: { candidateId, organizationId },
      relations: ['createdByUser'],
      order: { date: 'ASC', startTime: 'ASC' },
    });
  }

  async getMyInterviews(
    organizationId: number | undefined,
    userId: number,
  ): Promise<Interview[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    this.logger.log(
      `[getMyInterviews] userId: ${userId}, email: ${user.email}, organizationId: ${organizationId || 'undefined'}`,
    );

    const candidates = await this.candidateRepository.find({
      where: {
        email: user.email,
      },
      select: ['id', 'organizationId'],
    });

    this.logger.log(
      `[getMyInterviews] Found ${candidates.length} candidate(s) with email ${user.email}`,
    );

    if (candidates.length === 0) {
      return [];
    }

    const candidateIds = candidates.map((c) => c.id);

    const queryBuilder = this.interviewRepository
      .createQueryBuilder('interview')
      .leftJoinAndSelect('interview.candidate', 'candidate')
      .leftJoinAndSelect('interview.organization', 'organization')
      .where('interview.candidateId IN (:...candidateIds)', {
        candidateIds,
      });

    if (organizationId) {
      queryBuilder.andWhere('interview.organizationId = :organizationId', {
        organizationId,
      });
    }

    const interviews = await queryBuilder
      .orderBy('interview.date', 'ASC')
      .addOrderBy('interview.startTime', 'ASC')
      .getMany();

    this.logger.log(
      `[getMyInterviews] Found ${interviews.length} interview(s) for user ${userId}`,
    );

    return interviews;
  }

  async updateMyInterviewStatus(
    id: number,
    status: InterviewStatus,
    organizationId: number | undefined,
    userId: number,
  ): Promise<Interview> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    if (user.role !== Role.CANDIDATE) {
      throw new ForbiddenException(
        'Seuls les candidats peuvent modifier le statut de leurs entretiens',
      );
    }

    const interview = await this.interviewRepository.findOne({
      where: { id },
      relations: ['candidate'],
    });

    if (!interview) {
      throw new NotFoundException('Entretien introuvable');
    }

    if (interview.candidate.email !== user.email) {
      throw new ForbiddenException(
        'Vous ne pouvez modifier que vos propres entretiens',
      );
    }

    if (
      status !== InterviewStatus.CONFIRMED &&
      status !== InterviewStatus.CANCELLED
    ) {
      throw new BadRequestException(
        "Vous ne pouvez qu'accepter (confirmed) ou annuler (cancelled) un entretien",
      );
    }

    if (
      status === InterviewStatus.CONFIRMED &&
      interview.status !== InterviewStatus.PLANNED
    ) {
      throw new BadRequestException(
        `Vous ne pouvez accepter que les entretiens en statut "Planifié". Statut actuel: ${interview.status}`,
      );
    }

    if (
      status === InterviewStatus.CANCELLED &&
      interview.status !== InterviewStatus.PLANNED &&
      interview.status !== InterviewStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        `Vous ne pouvez annuler que les entretiens en statut "Planifié" ou "Confirmé". Statut actuel: ${interview.status}`,
      );
    }

    const previousStatus = interview.status;
    interview.status = status;
    await this.interviewRepository.save(interview);

    try {
      const candidate = interview.candidate;

      const candidateUser = await this.userRepository.findOne({
        where: { email: candidate.email },
      });

      this.logger.log(
        `[UPDATE INTERVIEW STATUS] Recherche utilisateur pour email: ${candidate.email}, trouvé: ${candidateUser ? `Oui (ID: ${candidateUser.id})` : 'Non'}`,
      );

      if (candidateUser) {
        const statusLabel =
          status === InterviewStatus.CONFIRMED ? 'accepté' : 'annulé';
        const actionLabel =
          status === InterviewStatus.CONFIRMED ? 'acceptation' : 'annulation';

        this.logger.log(
          `[UPDATE INTERVIEW STATUS] Envoi notification ${statusLabel} au candidat ${candidateUser.id}`,
        );
        await this.notificationsService.createAndSend(
          status === InterviewStatus.CONFIRMED
            ? NotificationType.INTERVIEW_UPDATED
            : NotificationType.INTERVIEW_CANCELLED,
          `Entretien ${statusLabel}`,
          `Votre ${actionLabel} de l'entretien "${interview.title}" a été enregistrée avec succès.`,
          interview.organizationId,
          [candidateUser.id],
          {
            candidateId: candidate.id,
            interviewId: interview.id,
            previousStatus,
            newStatus: status,
          },
        );
      } else {
        this.logger.warn(
          `[UPDATE INTERVIEW STATUS] Aucun utilisateur trouvé pour l'email ${candidate.email}. Notification non envoyée.`,
        );
      }

      const participants: User[] = [];
      if (interview.participantIds && interview.participantIds.length > 0) {
        for (const participantId of interview.participantIds) {
          const participant = await this.userRepository.findOne({
            where: { id: participantId },
          });
          if (participant) {
            participants.push(participant);
          }
        }
      }

      const userIds = participants
        .map((p) => p.id)
        .filter((id): id is number => id !== undefined && id !== userId);

      if (userIds.length > 0) {
        const statusLabel =
          status === InterviewStatus.CONFIRMED ? 'accepté' : 'refusé';
        await this.notificationsService.createAndSend(
          status === InterviewStatus.CONFIRMED
            ? NotificationType.INTERVIEW_UPDATED
            : NotificationType.INTERVIEW_CANCELLED,
          `Entretien ${statusLabel} par le candidat`,
          `L'entretien "${interview.title}" avec ${candidate.firstName} ${candidate.lastName} a été ${statusLabel} par le candidat.`,
          interview.organizationId,
          userIds,
          {
            candidateId: candidate.id,
            interviewId: interview.id,
            previousStatus,
            newStatus: status,
          },
        );
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.warn(
        `Erreur lors de l'envoi de la notification: ${errorMessage}`,
      );
    }

    return interview;
  }

  async syncWithCalendar(
    id: number,
    organizationId: number,
    userId: number,
  ): Promise<{ message: string; eventId?: string }> {
    await this.checkOrganizationAccess(organizationId, userId, [
      Role.ADMIN,
      Role.MANAGER,
    ]);

    const interview = await this.interviewRepository.findOne({
      where: { id, organizationId },
      relations: ['candidate'],
    });

    if (!interview) {
      throw new NotFoundException('Entretien introuvable');
    }

    if (!this.googleCalendarService.isConfigured()) {
      throw new BadRequestException(
        "Google Calendar n'est pas configuré. Veuillez configurer les credentials dans les variables d'environnement.",
      );
    }

    const candidate = await this.candidateRepository.findOne({
      where: { id: interview.candidateId },
    });

    if (!candidate) {
      throw new NotFoundException('Candidat introuvable');
    }

    const participants: User[] = [];
    if (interview.participantIds && interview.participantIds.length > 0) {
      for (const participantId of interview.participantIds) {
        const participant = await this.userRepository.findOne({
          where: { id: participantId },
        });
        if (participant) {
          participants.push(participant);
        }
      }
    }

    try {
      if (interview.calendarEventId) {
        await this.googleCalendarService.updateEvent(
          interview.calendarEventId,
          interview,
          {
            firstName: candidate.firstName,
            lastName: candidate.lastName,
            email: candidate.email,
          },
          participants,
        );
        return {
          message: 'Entretien synchronisé avec Google Calendar',
          eventId: interview.calendarEventId,
        };
      } else {
        const eventId = await this.googleCalendarService.createEvent(
          interview,
          {
            firstName: candidate.firstName,
            lastName: candidate.lastName,
            email: candidate.email,
          },
          participants,
        );

        if (eventId) {
          interview.calendarEventId = eventId;
          await this.interviewRepository.save(interview);
          return {
            message: 'Entretien créé dans Google Calendar',
            eventId: eventId,
          };
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      throw new BadRequestException(
        `Erreur lors de la synchronisation avec Google Calendar: ${errorMessage}`,
      );
    }

    return { message: 'Synchronisation effectuée' };
  }
}
