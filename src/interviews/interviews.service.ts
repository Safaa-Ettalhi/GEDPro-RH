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
  ) {}

  private async checkOrganizationAccess(
    organizationId: number,
    userId: number,
    requiredRoles: Role[] = [Role.ADMIN, Role.MANAGER, Role.USER],
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
      Role.MANAGER,
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

    // Vérifier les participants
    if (
      createInterviewDto.participantIds &&
      createInterviewDto.participantIds.length > 0
    ) {
      for (const participantId of createInterviewDto.participantIds) {
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

    Object.assign(interview, {
      ...updateInterviewDto,
      date: updateInterviewDto.date
        ? new Date(updateInterviewDto.date)
        : interview.date,
    });

    await this.interviewRepository.save(interview);

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
}
