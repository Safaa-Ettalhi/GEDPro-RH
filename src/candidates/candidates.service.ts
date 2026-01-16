/* eslint-disable prettier/prettier */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Repository, In } from 'typeorm';
import { Model } from 'mongoose';
import { Candidate } from './entities/candidate.entity';
import { CandidateDocument } from './entities/candidate-document.entity';
import { ManagerEvaluation } from './entities/manager-evaluation.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { UserOrganization } from '../organizations/entities/user-organization.entity';
import { JobOffer } from '../forms/entities/job-offer.entity';
import { Form } from '../forms/entities/form.entity';
import { Document } from '../documents/entities/document.entity';
import { User } from '../auth/entities/user.entity';
import { Interview } from '../interviews/entities/interview.entity';
import {
  CandidateStateHistory,
  CandidateStateHistoryDocument,
} from './schemas/candidate-state-history.schema';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { ChangeStateDto } from './dto/change-state.dto';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { CandidateState } from '../common/enums/candidate-state.enum';
import { Role } from '../common/enums/role.enum';
import { SkillsService } from '../skills/skills.service';
import { Logger } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../common/enums/notification-type.enum';

@Injectable()
export class CandidatesService {
  private readonly logger = new Logger(CandidatesService.name);

  constructor(
    @InjectRepository(Candidate)
    private candidateRepository: Repository<Candidate>,
    @InjectRepository(CandidateDocument)
    private candidateDocumentRepository: Repository<CandidateDocument>,
    @InjectRepository(ManagerEvaluation)
    private managerEvaluationRepository: Repository<ManagerEvaluation>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(UserOrganization)
    private userOrganizationRepository: Repository<UserOrganization>,
    @InjectRepository(JobOffer)
    private jobOfferRepository: Repository<JobOffer>,
    @InjectRepository(Form)
    private formRepository: Repository<Form>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Interview)
    private interviewRepository: Repository<Interview>,
    @InjectModel(CandidateStateHistory.name)
    private stateHistoryModel: Model<CandidateStateHistoryDocument>,
    private skillsService: SkillsService,
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

  // eslint-disable-next-line @typescript-eslint/require-await
  private async checkManagerAccess(
    candidate: Candidate,
    userId: number,
    userRole: Role,
  ): Promise<void> {
    if (userRole !== Role.MANAGER) {
      return;
    }

    if (!candidate.managerId) {
      throw new ForbiddenException(
        'Ce candidat ne vous est pas assigné. Seuls les candidats qui vous sont assignés sont accessibles.',
      );
    }

    if (candidate.managerId !== userId) {
      throw new ForbiddenException(
        'Ce candidat ne vous est pas assigné. Seuls les candidats qui vous sont assignés sont accessibles.',
      );
    }
  }

  async create(
    createCandidateDto: CreateCandidateDto,
    organizationId: number,
    userId: number,
    userRole: Role,
  ): Promise<Candidate> {
    const hasJobOffer = !!createCandidateDto.jobOfferId;

    const roleStr = String(userRole || '')
      .trim()
      .toLowerCase();
    const candidateRoleStr = String(Role.CANDIDATE).trim().toLowerCase();
    const isCandidate =
      roleStr === candidateRoleStr || userRole === Role.CANDIDATE;

    this.logger.log(
      `[CREATE CANDIDATE] userId: ${userId}, userRole: ${userRole} (${typeof userRole}), roleStr: "${roleStr}", candidateRoleStr: "${candidateRoleStr}", isCandidate: ${isCandidate}, hasJobOffer: ${hasJobOffer}, jobOfferId: ${createCandidateDto.jobOfferId}, organizationId: ${organizationId}`,
    );

    if (isCandidate) {
      const organization = await this.organizationRepository.findOne({
        where: { id: organizationId },
      });

      if (!organization) {
        throw new NotFoundException('Organisation introuvable');
      }

      if (createCandidateDto.jobOfferId) {
        const jobOffer = await this.jobOfferRepository.findOne({
          where: { id: createCandidateDto.jobOfferId, organizationId },
        });

        if (!jobOffer) {
          throw new NotFoundException(
            "Offre d'emploi introuvable ou n'appartient pas à cette organisation",
          );
        }

        const existingCandidate = await this.candidateRepository.findOne({
          where: {
            email: createCandidateDto.email,
            jobOfferId: createCandidateDto.jobOfferId,
            organizationId,
          },
        });

        if (existingCandidate) {
          throw new BadRequestException(
            "Vous avez déjà postulé à cette offre d'emploi",
          );
        }
      }
    } else {
      await this.checkOrganizationAccess(organizationId, userId);

      const organization = await this.organizationRepository.findOne({
        where: { id: organizationId },
      });

      if (!organization) {
        throw new NotFoundException('Organisation introuvable');
      }

      if (createCandidateDto.jobOfferId) {
        const jobOffer = await this.jobOfferRepository.findOne({
          where: { id: createCandidateDto.jobOfferId, organizationId },
        });

        if (!jobOffer) {
          throw new NotFoundException(
            "Offre d'emploi introuvable ou n'appartient pas à cette organisation",
          );
        }

        const existingCandidate = await this.candidateRepository.findOne({
          where: {
            email: createCandidateDto.email,
            jobOfferId: createCandidateDto.jobOfferId,
            organizationId,
          },
        });

        if (existingCandidate) {
          throw new BadRequestException(
            "Ce candidat a déjà postulé à cette offre d'emploi",
          );
        }
      }
    }

    if (createCandidateDto.formId) {
      const form = await this.formRepository.findOne({
        where: { id: createCandidateDto.formId, organizationId },
      });

      if (!form) {
        throw new NotFoundException(
          "Formulaire introuvable ou n'appartient pas à cette organisation",
        );
      }
    }
    if (createCandidateDto.managerId) {
      const managerOrg = await this.userOrganizationRepository.findOne({
        where: {
          userId: createCandidateDto.managerId,
          organizationId,
          role: Role.MANAGER,
        },
      });

      if (!managerOrg) {
        throw new NotFoundException(
          "Manager introuvable ou n'appartient pas à cette organisation",
        );
      }
    }

    const candidate = this.candidateRepository.create({
      ...createCandidateDto,
      organizationId,
      state: CandidateState.NOUVEAU,
      createdBy: userId,
    });

    const savedCandidate = await this.candidateRepository.save(candidate);

    await this.recordStateChange(
      savedCandidate.id,
      organizationId,
      null,
      CandidateState.NOUVEAU,
      userId,
      'Candidat créé',
    );

    // Notifier les utilisateurs RH et MANAGER de la nouvelle candidature
    try {
      const rhUsers = await this.userOrganizationRepository.find({
        where: {
          organizationId,
          role: In([Role.ADMIN, Role.RH, Role.MANAGER]),
        },
        relations: ['user'],
      });

      const userIds = rhUsers
        .map((uo) => uo.user?.id)
        .filter((id): id is number => id !== undefined && id !== userId);

      this.logger.log(
        `Création de notification pour ${userIds.length} utilisateur(s) ADMIN/MANAGER (org: ${organizationId})`,
      );

      if (userIds.length > 0) {
        await this.notificationsService.createAndSend(
          NotificationType.NEW_CANDIDATE,
          'Nouvelle candidature',
          `${savedCandidate.firstName} ${savedCandidate.lastName} a postulé`,
          organizationId,
          userIds,
          {
            candidateId: savedCandidate.id,
          },
        );
        this.logger.log(
          `Notification de nouvelle candidature envoyée à ${userIds.length} utilisateur(s)`,
        );
      } else {
        this.logger.warn(
          `Aucun utilisateur ADMIN/MANAGER trouvé pour l'organisation ${organizationId}`,
        );
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.warn(
        `Erreur lors de l'envoi de la notification de nouvelle candidature: ${errorMessage}`,
      );
    }

    if (isCandidate) {
      return savedCandidate;
    }
    return this.findOne(savedCandidate.id, organizationId, userId);
  }

  async findAll(
    organizationId: number | undefined,
    userId: number,
    userRole: Role,
    filters?: {
      state?: CandidateState;
      jobOfferId?: number;
      formId?: number;
    },
  ): Promise<Candidate[]> {
    let finalOrganizationId = organizationId;

    if (!finalOrganizationId) {
      const userOrg = await this.userOrganizationRepository.findOne({
        where: { userId },
      });

      if (!userOrg) {
        throw new BadRequestException(
          "Vous n'appartenez à aucune organisation",
        );
      }

      finalOrganizationId = userOrg.organizationId;
    }

    const userOrg = await this.checkOrganizationAccess(
      finalOrganizationId,
      userId,
    );

    const queryBuilder = this.candidateRepository
      .createQueryBuilder('candidate')
      .leftJoinAndSelect('candidate.jobOffer', 'jobOffer')
      .leftJoinAndSelect('candidate.form', 'form')
      .leftJoinAndSelect('candidate.manager', 'manager')
      .where('candidate.organizationId = :organizationId', {
        organizationId: finalOrganizationId,
      });

    if (userOrg.role === Role.MANAGER) {
      queryBuilder.andWhere('candidate.managerId = :managerId', {
        managerId: userId,
      });
    }

    if (filters?.state) {
      queryBuilder.andWhere('candidate.state = :state', {
        state: filters.state,
      });
    }

    if (filters?.jobOfferId) {
      queryBuilder.andWhere('candidate.jobOfferId = :jobOfferId', {
        jobOfferId: filters.jobOfferId,
      });
    }

    if (filters?.formId) {
      queryBuilder.andWhere('candidate.formId = :formId', {
        formId: filters.formId,
      });
    }

    return queryBuilder.orderBy('candidate.createdAt', 'DESC').getMany();
  }

  async findMyApplications(
    organizationId: number | undefined,
    userId: number,
  ): Promise<Candidate[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const queryBuilder = this.candidateRepository
      .createQueryBuilder('candidate')
      .leftJoinAndSelect('candidate.jobOffer', 'jobOffer')
      .leftJoinAndSelect('candidate.form', 'form')
      .leftJoinAndSelect('candidate.manager', 'manager')
      .where('candidate.email = :email', { email: user.email });

    if (organizationId) {
      queryBuilder.andWhere('candidate.organizationId = :organizationId', {
        organizationId,
      });
    }

    const candidates = await queryBuilder
      .orderBy('candidate.createdAt', 'DESC')
      .getMany();

    return candidates;
  }

  async findOne(
    id: number,
    organizationId: number,
    userId: number,
    userRole?: Role,
  ): Promise<Candidate> {
    const userOrg = await this.checkOrganizationAccess(organizationId, userId);

    const candidate = await this.candidateRepository
      .createQueryBuilder('candidate')
      .leftJoinAndSelect('candidate.jobOffer', 'jobOffer')
      .leftJoinAndSelect('candidate.form', 'form')
      .leftJoinAndSelect('candidate.manager', 'manager')
      .where('candidate.id = :id', { id })
      .andWhere('candidate.organizationId = :organizationId', {
        organizationId,
      })
      .getOne();

    if (!candidate) {
      throw new NotFoundException('Candidat introuvable');
    }

    const role = userRole || userOrg.role;
    await this.checkManagerAccess(candidate, userId, role);

    return candidate;
  }

  async update(
    id: number,
    updateCandidateDto: UpdateCandidateDto,
    organizationId: number,
    userId: number,
    userRole?: Role,
  ): Promise<Candidate> {
    const userOrg = await this.checkOrganizationAccess(organizationId, userId);

    const candidate = await this.candidateRepository.findOne({
      where: { id, organizationId },
    });

    if (!candidate) {
      throw new NotFoundException('Candidat introuvable');
    }

    if (candidate.jobOfferId) {
      if (
        updateCandidateDto.firstName ||
        updateCandidateDto.lastName ||
        updateCandidateDto.email ||
        updateCandidateDto.phone
      ) {
        throw new ForbiddenException(
          "Vous ne pouvez pas modifier les informations personnelles d'un candidat qui a postulé à une offre d'emploi. Vous pouvez uniquement modifier le statut, assigner un manager ou ajouter des notes.",
        );
      }
    } else {
      if (candidate.createdBy && candidate.createdBy !== userId) {
        const role = userRole || userOrg.role;
        if (role !== Role.ADMIN && role !== Role.RH) {
          throw new ForbiddenException(
            'Vous ne pouvez modifier que les candidats que vous avez créés',
          );
        }
      }
    }

    const role = userRole || userOrg.role;
    await this.checkManagerAccess(candidate, userId, role);

    if (updateCandidateDto.jobOfferId) {
      const jobOffer = await this.jobOfferRepository.findOne({
        where: { id: updateCandidateDto.jobOfferId, organizationId },
      });

      if (!jobOffer) {
        throw new NotFoundException(
          "Offre d'emploi introuvable ou n'appartient pas à cette organisation",
        );
      }
    }

    const previousManagerId = candidate.managerId;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const hadNotes = !!candidate.notes;
    const managerAssigned = updateCandidateDto.managerId !== undefined && updateCandidateDto.managerId !== previousManagerId;
    const notesAdded = updateCandidateDto.notes !== undefined && updateCandidateDto.notes !== candidate.notes && updateCandidateDto.notes.trim().length > 0;

    if (updateCandidateDto.managerId !== undefined) {
      if (updateCandidateDto.managerId === null) {
        candidate.managerId = null;
      } else {
        const managerOrg = await this.userOrganizationRepository.findOne({
          where: {
            userId: updateCandidateDto.managerId,
            organizationId,
            role: Role.MANAGER,
          },
        });

        if (!managerOrg) {
          throw new NotFoundException(
            "Manager introuvable ou n'appartient pas à cette organisation",
          );
        }
        candidate.managerId = updateCandidateDto.managerId;
      }
    }

    if (candidate.jobOfferId) {
      if (updateCandidateDto.notes !== undefined) {
        candidate.notes = updateCandidateDto.notes;
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { managerId, ...updateFields } = updateCandidateDto;
      Object.assign(candidate, updateFields);
    }

    await this.candidateRepository.save(candidate);

    // Notifier le candidat des changements
    try {
      const candidateUser = await this.userRepository.findOne({
        where: { email: candidate.email },
      });

      if (candidateUser) {
        if (managerAssigned && candidate.managerId) {
          const manager = await this.userRepository.findOne({
            where: { id: candidate.managerId },
          });
          const managerName = manager?.name || 'un manager';
          await this.notificationsService.createAndSend(
            NotificationType.CANDIDATE_ASSIGNED,
            'Manager assigné à votre candidature',
            `Un manager (${managerName}) a été assigné à votre candidature pour ${candidate.firstName} ${candidate.lastName}.`,
            organizationId,
            [candidateUser.id],
            {
              candidateId: candidate.id,
              managerId: candidate.managerId,
            },
          );
        }

        if (notesAdded) {
          await this.notificationsService.createAndSend(
            NotificationType.STATE_CHANGED,
            'Note ajoutée à votre candidature',
            `Une note a été ajoutée à votre candidature pour ${candidate.firstName} ${candidate.lastName}.`,
            organizationId,
            [candidateUser.id],
            {
              candidateId: candidate.id,
            },
          );
        }
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.warn(
        `Erreur lors de l'envoi de la notification au candidat: ${errorMessage}`,
      );
    }

    const finalRole = userRole || userOrg.role;
    return this.findOne(id, organizationId, userId, finalRole);
  }

  async changeState(
    id: number,
    changeStateDto: ChangeStateDto,
    organizationId: number,
    userId: number,
    userRole?: Role,
  ): Promise<Candidate> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const isCandidate =
      userRole === Role.CANDIDATE ||
      String(userRole || '')
        .trim()
        .toLowerCase() === String(Role.CANDIDATE).trim().toLowerCase() ||
      String(userRole || '')
        .trim()
        .toLowerCase() === 'candidate' ||
      user.role === Role.CANDIDATE ||
      String(user.role || '')
        .trim()
        .toLowerCase() === String(Role.CANDIDATE).trim().toLowerCase() ||
      String(user.role || '')
        .trim()
        .toLowerCase() === 'candidate';

    const candidate = await this.candidateRepository.findOne({
      where: { id, organizationId },
    });

    if (!candidate) {
      throw new NotFoundException('Candidat introuvable');
    }

    const previousState = candidate.state;
    const newState = changeStateDto.newState;

    if (previousState === newState) {
      throw new BadRequestException('Le candidat est déjà dans cet état');
    }

    if (isCandidate) {
      if (candidate.email !== user.email) {
        throw new ForbiddenException(
          'Vous ne pouvez modifier que vos propres candidatures',
        );
      }
      if (newState !== CandidateState.ANNULE) {
        throw new ForbiddenException(
          "Vous ne pouvez qu'annuler vos candidatures",
        );
      }
    } else {
      const userOrgForAccess = await this.checkOrganizationAccess(organizationId, userId, [Role.ADMIN,Role.RH,]);
      const role = userRole || userOrgForAccess.role;
      await this.checkManagerAccess(candidate, userId, role);
    }

    candidate.state = newState;
    await this.candidateRepository.save(candidate);

    await this.recordStateChange(
      id,
      organizationId,
      previousState,
      newState,
      userId,
      changeStateDto.comment ||
        `Changement d'état de ${previousState} à ${newState}`,
      user?.name || 'Utilisateur inconnu',
    );

    try {
      const rhUsers = await this.userOrganizationRepository.find({
        where: {
          organizationId,
          role: In([Role.ADMIN, Role.RH, Role.MANAGER]),
        },
        relations: ['user'],
      });

      const userIds = rhUsers
        .map((uo) => uo.user?.id)
        .filter((id): id is number => id !== undefined && id !== userId);

      if (userIds.length > 0) {
        const stateLabels: Record<CandidateState, string> = {
          [CandidateState.NOUVEAU]: 'Nouveau',
          [CandidateState.PRESELECTIONNE]: 'Présélectionné',
          [CandidateState.ENTRETIEN_PLANIFIE]: 'Entretien planifié',
          [CandidateState.EN_ENTRETIEN]: 'En entretien',
          [CandidateState.ACCEPTE]: 'Accepté',
          [CandidateState.REFUSE]: 'Refusé',
          [CandidateState.ANNULE]: 'Annulé',
        };

        await this.notificationsService.createAndSend(
          NotificationType.STATE_CHANGED,
          "Changement d'état du candidat",
          `${candidate.firstName} ${candidate.lastName} est maintenant ${stateLabels[newState]}`,
          organizationId,
          userIds,
          {
            candidateId: candidate.id,
            previousState,
            newState,
          },
        );
      }

      if (!isCandidate) {
        const candidateUser = await this.userRepository.findOne({
          where: { email: candidate.email },
        });

        if (candidateUser) {
          const stateLabels: Record<CandidateState, string> = {
            [CandidateState.NOUVEAU]: 'Nouveau',
            [CandidateState.PRESELECTIONNE]: 'Présélectionné',
            [CandidateState.ENTRETIEN_PLANIFIE]: 'Entretien planifié',
            [CandidateState.EN_ENTRETIEN]: 'En entretien',
            [CandidateState.ACCEPTE]: 'Accepté',
            [CandidateState.REFUSE]: 'Refusé',
            [CandidateState.ANNULE]: 'Annulé',
          };

          await this.notificationsService.createAndSend(
            NotificationType.STATE_CHANGED,
            'Mise à jour de votre candidature',
            `Le statut de votre candidature a été modifié : ${stateLabels[newState]}`,
            organizationId,
            [candidateUser.id],
            {
              candidateId: candidate.id,
              previousState,
              newState,
            },
          );
        }
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.warn(
        `Erreur lors de l'envoi de la notification de changement d'état: ${errorMessage}`,
      );
    }

    if (isCandidate) {
      return candidate;
    }
    
    const finalRole = userRole || (await this.checkOrganizationAccess(organizationId, userId, [
      Role.ADMIN,
      Role.RH,
    ])).role;
    return this.findOne(id, organizationId, userId, finalRole);
  }

  async getStateHistory(
    candidateId: number,
    organizationId: number,
    userId: number,
    userRole?: Role,
  ): Promise<CandidateStateHistory[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const isCandidate = 
      userRole === Role.CANDIDATE || 
      String(userRole || '').trim().toLowerCase() === String(Role.CANDIDATE).trim().toLowerCase() ||
      String(userRole || '').trim().toLowerCase() === 'candidate' ||
      user.role === Role.CANDIDATE ||
      String(user.role || '').trim().toLowerCase() === String(Role.CANDIDATE).trim().toLowerCase() ||
      String(user.role || '').trim().toLowerCase() === 'candidate';

    const candidate = await this.candidateRepository.findOne({
      where: { id: candidateId, organizationId },
    });

    if (!candidate) {
      throw new NotFoundException('Candidat introuvable');
    }

    if (isCandidate) {
      if (candidate.email !== user.email) {
        throw new ForbiddenException(
          "Vous ne pouvez accéder qu'à l'historique de vos propres candidatures",
        );
      }
    } else {
      const userOrg = await this.checkOrganizationAccess(organizationId, userId);
      const role = userRole || userOrg.role;
      await this.checkManagerAccess(candidate, userId, role);
    }

    return this.stateHistoryModel
      .find({
        candidateId,
        organizationId,
      })
      .sort({ changedAt: -1 })
      .exec();
  }

  async associateDocument(
    candidateId: number,
    documentId: number,
    organizationId: number,
    userId: number,
    userRole?: Role,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const isCandidate = 
      userRole === Role.CANDIDATE || 
      String(userRole || '').trim().toLowerCase() === String(Role.CANDIDATE).trim().toLowerCase() ||
      String(userRole || '').trim().toLowerCase() === 'candidate' ||
      user.role === Role.CANDIDATE ||
      String(user.role || '').trim().toLowerCase() === String(Role.CANDIDATE).trim().toLowerCase() ||
      String(user.role || '').trim().toLowerCase() === 'candidate';

    const candidate = await this.candidateRepository.findOne({
      where: { id: candidateId, organizationId },
    });

    if (!candidate) {
      throw new NotFoundException('Candidat introuvable');
    }

    if (!isCandidate) {
      const userOrg = await this.checkOrganizationAccess(organizationId, userId);
      const role = userRole || userOrg.role;

      await this.checkManagerAccess(candidate, userId, role);
    } else {
      if (candidate.email !== user.email) {
        throw new ForbiddenException(
          "Vous ne pouvez associer des documents qu'à vos propres candidatures",
        );
      }
    }

    let document: Document | null = null;
    
    if (isCandidate) {
      document = await this.documentRepository.findOne({
        where: { id: documentId, uploadedBy: userId },
      });
      
      if (!document) {
        throw new NotFoundException('Document introuvable ou vous n\'êtes pas autorisé à l\'utiliser');
      }
    } else {
      document = await this.documentRepository.findOne({
        where: { id: documentId, organizationId },
      });
      
      if (!document) {
        throw new NotFoundException('Document introuvable');
      }
    }

    const existingAssociation = await this.candidateDocumentRepository.findOne({
      where: { candidateId, documentId },
    });

    if (existingAssociation) {
      throw new BadRequestException(
        'Ce document est déjà associé à ce candidat',
      );
    }

    const association = this.candidateDocumentRepository.create({
      candidateId,
      documentId,
    });

    await this.candidateDocumentRepository.save(association);

    try {
      const rhUsers = await this.userOrganizationRepository.find({
        where: {
          organizationId,
          role: In([Role.ADMIN, Role.RH, Role.MANAGER]),
        },
        relations: ['user'],
      });

      const userIds = rhUsers
        .map((uo) => uo.user?.id)
        .filter((id): id is number => id !== undefined && id !== userId);

      if (userIds.length > 0) {
        await this.notificationsService.createAndSend(
          NotificationType.DOCUMENT_ASSOCIATED,
          'Document associé à un candidat',
          `Le document "${document.originalName}" a été associé à ${candidate.firstName} ${candidate.lastName}`,
          organizationId,
          userIds,
          {
            candidateId: candidate.id,
            documentId: document.id,
          },
        );
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.warn(
        `Erreur lors de l'envoi de la notification d'association: ${errorMessage}`,
      );
    }

    if (document.extractedText && document.extractedText.trim().length > 0) {
      this.skillsService
        .extractAndAssociateSkills(
          document.extractedText,
          candidateId,
          documentId,
          organizationId,
        )
        .catch((error: unknown) => {
          const errorMessage =
            error instanceof Error ? error.message : 'Erreur inconnue';
          this.logger.error(
            `Erreur lors de l'extraction des compétences pour le document ${documentId}: ${errorMessage}`,
          );
        });
    }

    return { message: 'Document associé au candidat avec succès' };
  }

  async removeDocument(
    candidateId: number,
    documentId: number,
    organizationId: number,
    userId: number,
    userRole?: Role,
  ): Promise<{ message: string }> {
    const userOrg = await this.checkOrganizationAccess(organizationId, userId);

    const association = await this.candidateDocumentRepository.findOne({
      where: { candidateId, documentId },
      relations: ['candidate', 'document'],
    });

    if (!association) {
      throw new NotFoundException('Association introuvable');
    }

    if (association.candidate.organizationId !== organizationId) {
      throw new ForbiddenException(
        "Cette association n'appartient pas à votre organisation",
      );
    }

    // Vérifier l'accès Manager si nécessaire
    const role = userRole || userOrg.role;
    await this.checkManagerAccess(association.candidate, userId, role);

    await this.candidateDocumentRepository.remove(association);

    return { message: 'Document dissocié du candidat avec succès' };
  }

  async getCandidateDocuments(
    candidateId: number,
    organizationId: number,
    userId: number,
    userRole?: Role,
  ): Promise<Document[]> {
    const userOrg = await this.checkOrganizationAccess(organizationId, userId);

    const candidate = await this.candidateRepository.findOne({
      where: { id: candidateId, organizationId },
    });

    if (!candidate) {
      throw new NotFoundException('Candidat introuvable');
    }

    // Vérifier l'accès Manager si nécessaire
    const role = userRole || userOrg.role;
    await this.checkManagerAccess(candidate, userId, role);

    const associations = await this.candidateDocumentRepository.find({
      where: { candidateId },
      relations: ['document'],
    });

    return associations.map((assoc) => assoc.document);
  }

  async remove(
    id: number,
    organizationId: number,
    userId: number,
    userRole?: Role,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const isCandidate = 
      userRole === Role.CANDIDATE || 
      String(userRole || '').trim().toLowerCase() === String(Role.CANDIDATE).trim().toLowerCase() ||
      String(userRole || '').trim().toLowerCase() === 'candidate' ||
      user.role === Role.CANDIDATE ||
      String(user.role || '').trim().toLowerCase() === String(Role.CANDIDATE).trim().toLowerCase() ||
      String(user.role || '').trim().toLowerCase() === 'candidate';

    const candidate = await this.candidateRepository.findOne({
      where: { id, organizationId },
    });

    if (!candidate) {
      throw new NotFoundException('Candidat introuvable');
    }
    if (isCandidate) {
      if (candidate.email !== user.email) {
        throw new ForbiddenException(
          "Vous ne pouvez supprimer que vos propres candidatures",
        );
      }
    } else {
      const userOrg = await this.checkOrganizationAccess(organizationId, userId, [
        Role.ADMIN,
      ]);

      const role = userRole || userOrg.role;
      await this.checkManagerAccess(candidate, userId, role);
    }

    await this.candidateRepository.remove(candidate);

    return { message: 'Candidat supprimé avec succès' };
  }

  private async recordStateChange(
    candidateId: number,
    organizationId: number,
    previousState: CandidateState | null,
    newState: CandidateState,
    userId: number,
    comment: string,
    userName?: string,
  ): Promise<void> {
    const user = userName
      ? null
      : await this.userRepository.findOne({ where: { id: userId } });

    const history = new this.stateHistoryModel({
      candidateId,
      organizationId,
      previousState: previousState || CandidateState.NOUVEAU,
      newState,
      changedBy: userId,
      changedByName: userName || user?.name || 'Utilisateur inconnu',
      comment,
      changedAt: new Date(),
    });

    await history.save();
  }

  async assignManager(
    candidateId: number,
    managerId: number | null,
    organizationId: number,
    userId: number,
  ): Promise<Candidate> {
    await this.checkOrganizationAccess(organizationId, userId, [
      Role.ADMIN,
      Role.RH,
    ]);

    const candidate = await this.candidateRepository.findOne({
      where: { id: candidateId, organizationId },
    });

    if (!candidate) {
      throw new NotFoundException('Candidat introuvable');
    }

    if (managerId === null) {
      candidate.managerId = null;
    } else {
      const managerOrg = await this.userOrganizationRepository.findOne({
        where: {
          userId: managerId,
          organizationId,
          role: Role.MANAGER,
        },
      });

      if (!managerOrg) {
        throw new NotFoundException(
          "Manager introuvable ou n'appartient pas à cette organisation",
        );
      }

      candidate.managerId = managerId;
    }

    const updatedCandidate = await this.candidateRepository.save(candidate);

    if (managerId) {
      try {
        await this.notificationsService.createAndSend(
          NotificationType.CANDIDATE_ASSIGNED,
          'Candidat assigné',
          `Le candidat ${candidate.firstName} ${candidate.lastName} vous a été assigné`,
          organizationId,
          [managerId],
          {
            candidateId: candidate.id,
          },
        );
      } catch (error) {
        this.logger.warn(
          `Erreur lors de l'envoi de la notification d'assignation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        );
      }
    }

    return this.findOne(updatedCandidate.id, organizationId, userId);
  }

  async createEvaluation(
    createEvaluationDto: CreateEvaluationDto,
    organizationId: number,
    userId: number,
  ): Promise<ManagerEvaluation> {
    const userOrg = await this.checkOrganizationAccess(organizationId, userId, [
      Role.MANAGER,
    ]);

    if (userOrg.role !== Role.MANAGER) {
      throw new ForbiddenException(
        'Seuls les Managers peuvent créer des évaluations',
      );
    }

    const candidate = await this.candidateRepository.findOne({
      where: { id: createEvaluationDto.candidateId, organizationId },
    });

    if (!candidate) {
      throw new NotFoundException('Candidat introuvable');
    }

    await this.checkManagerAccess(candidate, userId, Role.MANAGER);

    if (createEvaluationDto.interviewId) {
      const interview = await this.interviewRepository.findOne({
        where: {
          id: createEvaluationDto.interviewId,
          organizationId,
          candidateId: createEvaluationDto.candidateId,
        },
      });

      if (!interview) {
        throw new NotFoundException(
          "Entretien introuvable ou n'appartient pas à ce candidat",
        );
      }

      if (
        !interview.participantIds ||
        !interview.participantIds.includes(userId)
      ) {
        throw new ForbiddenException(
          "Vous n'êtes pas participant à cet entretien",
        );
      }
    }

    const evaluation = this.managerEvaluationRepository.create({
      candidateId: createEvaluationDto.candidateId,
      interviewId: createEvaluationDto.interviewId ?? null,
      managerId: userId,
      organizationId,
      recommendation: createEvaluationDto.recommendation,
      comment: createEvaluationDto.comment ?? undefined,
    });

    const savedEvaluation = await this.managerEvaluationRepository.save(
      evaluation,
    );

    try {
      const rhUsers = await this.userOrganizationRepository.find({
        where: {
          organizationId,
          role: In([Role.ADMIN, Role.RH]),
        },
        relations: ['user'],
      });

      const userIds = rhUsers
        .map((uo) => uo.user?.id)
        .filter((id): id is number => id !== undefined);

      if (userIds.length > 0) {
        const recommendationLabels: Record<string, string> = {
          accept: 'Acceptation',
          reject: 'Refus',
          second_interview: 'Deuxième entretien',
        };

        await this.notificationsService.createAndSend(
          NotificationType.STATE_CHANGED,
          'Avis Manager reçu',
          `Le Manager ${(await this.userRepository.findOne({ where: { id: userId } }))?.name || 'Inconnu'} a donné son avis pour ${candidate.firstName} ${candidate.lastName}: ${recommendationLabels[createEvaluationDto.recommendation] || createEvaluationDto.recommendation}`,
          organizationId,
          userIds,
          {
            candidateId: candidate.id,
            evaluationId: savedEvaluation.id,
            recommendation: createEvaluationDto.recommendation,
          },
        );
      }
    } catch (error) {
      this.logger.warn(
        `Erreur lors de l'envoi de la notification d'évaluation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      );
    }

    const result = await this.managerEvaluationRepository.findOne({
      where: { id: savedEvaluation.id },
      relations: ['candidate', 'interview', 'manager'],
    });

    if (!result) {
      throw new NotFoundException('Évaluation introuvable après création');
    }

    return result;
  }

  async getCandidateEvaluations(
    candidateId: number,
    organizationId: number,
    userId: number,
  ): Promise<ManagerEvaluation[]> {
    await this.checkOrganizationAccess(organizationId, userId);

    const candidate = await this.candidateRepository.findOne({
      where: { id: candidateId, organizationId },
    });

    if (!candidate) {
      throw new NotFoundException('Candidat introuvable');
    }

    return this.managerEvaluationRepository.find({
      where: { candidateId, organizationId },
      relations: ['manager', 'interview'],
      order: { createdAt: 'DESC' },
    });
  }

  async getManagerEvaluations(
    organizationId: number,
    userId: number,
  ): Promise<ManagerEvaluation[]> {
    const userOrg = await this.checkOrganizationAccess(organizationId, userId, [
      Role.MANAGER,
    ]);

    if (userOrg.role !== Role.MANAGER) {
      throw new ForbiddenException(
        'Seuls les Managers peuvent consulter leurs évaluations',
      );
    }

    return this.managerEvaluationRepository.find({
      where: { managerId: userId, organizationId },
      relations: ['candidate', 'interview'],
      order: { createdAt: 'DESC' },
    });
  }


  async getMyDocuments(
    organizationId: number | undefined,
    userId: number,
  ): Promise<Document[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const allDocuments: Document[] = [];

    if (organizationId) {
      const documentsUploadedByUser = await this.documentRepository.find({
        where: {
          organizationId,
          uploadedBy: userId,
        },
      });
      allDocuments.push(...documentsUploadedByUser);
    } else {
      const documentsUploadedByUser = await this.documentRepository.find({
        where: {
          uploadedBy: userId,
        },
      });
      allDocuments.push(...documentsUploadedByUser);
    }

    if (organizationId) {
      const candidates = await this.candidateRepository.find({
        where: {
          organizationId,
          email: user.email,
        },
        select: ['id'],
      });

      if (candidates.length > 0) {
        const candidateIds = candidates.map((c) => c.id);
        const associations = await this.candidateDocumentRepository.find({
          where: { candidateId: In(candidateIds) },
          relations: ['document'],
        });
        allDocuments.push(...associations.map((assoc) => assoc.document));
      }
    } else {
      const candidates = await this.candidateRepository.find({
        where: {
          email: user.email,
        },
        select: ['id'],
      });

      if (candidates.length > 0) {
        const candidateIds = candidates.map((c) => c.id);
        const associations = await this.candidateDocumentRepository.find({
          where: { candidateId: In(candidateIds) },
          relations: ['document'],
        });
        allDocuments.push(...associations.map((assoc) => assoc.document));
      }
    }

    const uniqueDocuments = Array.from(
      new Map(allDocuments.map((doc) => [doc.id, doc])).values(),
    );

    return uniqueDocuments;
  }
}
