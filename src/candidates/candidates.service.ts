import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Repository } from 'typeorm';
import { Model } from 'mongoose';
import { Candidate } from './entities/candidate.entity';
import { CandidateDocument } from './entities/candidate-document.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { UserOrganization } from '../organizations/entities/user-organization.entity';
import { JobOffer } from '../forms/entities/job-offer.entity';
import { Form } from '../forms/entities/form.entity';
import { Document } from '../documents/entities/document.entity';
import { User } from '../auth/entities/user.entity';
import {
  CandidateStateHistory,
  CandidateStateHistoryDocument,
} from './schemas/candidate-state-history.schema';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { ChangeStateDto } from './dto/change-state.dto';
import { CandidateState } from '../common/enums/candidate-state.enum';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class CandidatesService {
  constructor(
    @InjectRepository(Candidate)
    private candidateRepository: Repository<Candidate>,
    @InjectRepository(CandidateDocument)
    private candidateDocumentRepository: Repository<CandidateDocument>,
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
    @InjectModel(CandidateStateHistory.name)
    private stateHistoryModel: Model<CandidateStateHistoryDocument>,
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
    createCandidateDto: CreateCandidateDto,
    organizationId: number,
    userId: number,
  ): Promise<Candidate> {
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

    return this.findOne(savedCandidate.id, organizationId, userId);
  }

  async findAll(
    organizationId: number,
    userId: number,
    filters?: {
      state?: CandidateState;
      jobOfferId?: number;
      formId?: number;
    },
  ): Promise<Candidate[]> {
    await this.checkOrganizationAccess(organizationId, userId);

    const queryBuilder = this.candidateRepository
      .createQueryBuilder('candidate')
      .leftJoinAndSelect('candidate.jobOffer', 'jobOffer')
      .leftJoinAndSelect('candidate.form', 'form')
      .where('candidate.organizationId = :organizationId', { organizationId });

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

  async findOne(
    id: number,
    organizationId: number,
    userId: number,
  ): Promise<Candidate> {
    await this.checkOrganizationAccess(organizationId, userId);

    const candidate = await this.candidateRepository
      .createQueryBuilder('candidate')
      .leftJoinAndSelect('candidate.jobOffer', 'jobOffer')
      .leftJoinAndSelect('candidate.form', 'form')
      .where('candidate.id = :id', { id })
      .andWhere('candidate.organizationId = :organizationId', {
        organizationId,
      })
      .getOne();

    if (!candidate) {
      throw new NotFoundException('Candidat introuvable');
    }

    return candidate;
  }

  async update(
    id: number,
    updateCandidateDto: UpdateCandidateDto,
    organizationId: number,
    userId: number,
  ): Promise<Candidate> {
    await this.checkOrganizationAccess(organizationId, userId);

    const candidate = await this.candidateRepository.findOne({
      where: { id, organizationId },
    });

    if (!candidate) {
      throw new NotFoundException('Candidat introuvable');
    }

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

    Object.assign(candidate, updateCandidateDto);
    await this.candidateRepository.save(candidate);

    return this.findOne(id, organizationId, userId);
  }

  async changeState(
    id: number,
    changeStateDto: ChangeStateDto,
    organizationId: number,
    userId: number,
  ): Promise<Candidate> {
    await this.checkOrganizationAccess(organizationId, userId, [
      Role.ADMIN,
      Role.MANAGER,
    ]);

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

    candidate.state = newState;
    await this.candidateRepository.save(candidate);

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

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

    return this.findOne(id, organizationId, userId);
  }

  async getStateHistory(
    candidateId: number,
    organizationId: number,
    userId: number,
  ): Promise<CandidateStateHistory[]> {
    await this.checkOrganizationAccess(organizationId, userId);

    const candidate = await this.candidateRepository.findOne({
      where: { id: candidateId, organizationId },
    });

    if (!candidate) {
      throw new NotFoundException('Candidat introuvable');
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
  ): Promise<{ message: string }> {
    await this.checkOrganizationAccess(organizationId, userId);

    const candidate = await this.candidateRepository.findOne({
      where: { id: candidateId, organizationId },
    });

    if (!candidate) {
      throw new NotFoundException('Candidat introuvable');
    }

    const document = await this.documentRepository.findOne({
      where: { id: documentId, organizationId },
    });

    if (!document) {
      throw new NotFoundException('Document introuvable');
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

    return { message: 'Document associé au candidat avec succès' };
  }

  async removeDocument(
    candidateId: number,
    documentId: number,
    organizationId: number,
    userId: number,
  ): Promise<{ message: string }> {
    await this.checkOrganizationAccess(organizationId, userId);

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

    await this.candidateDocumentRepository.remove(association);

    return { message: 'Document dissocié du candidat avec succès' };
  }

  async getCandidateDocuments(
    candidateId: number,
    organizationId: number,
    userId: number,
  ): Promise<Document[]> {
    await this.checkOrganizationAccess(organizationId, userId);

    const candidate = await this.candidateRepository.findOne({
      where: { id: candidateId, organizationId },
    });

    if (!candidate) {
      throw new NotFoundException('Candidat introuvable');
    }

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
  ): Promise<{ message: string }> {
    await this.checkOrganizationAccess(organizationId, userId, [
      Role.ADMIN,
      Role.MANAGER,
    ]);

    const candidate = await this.candidateRepository.findOne({
      where: { id, organizationId },
    });

    if (!candidate) {
      throw new NotFoundException('Candidat introuvable');
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
}
