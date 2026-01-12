import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Skill } from './entities/skill.entity';
import { CandidateSkill } from './entities/candidate-skill.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { UserOrganization } from '../organizations/entities/user-organization.entity';
import { Candidate } from '../candidates/entities/candidate.entity';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { Role } from '../common/enums/role.enum';
import { SkillsExtractionService } from './services/skills-extraction.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../common/enums/notification-type.enum';

@Injectable()
export class SkillsService {
  private readonly logger = new Logger(SkillsService.name);

  constructor(
    @InjectRepository(Skill)
    private skillRepository: Repository<Skill>,
    @InjectRepository(CandidateSkill)
    private candidateSkillRepository: Repository<CandidateSkill>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(UserOrganization)
    private userOrganizationRepository: Repository<UserOrganization>,
    @InjectRepository(Candidate)
    private candidateRepository: Repository<Candidate>,
    private skillsExtractionService: SkillsExtractionService,
    private readonly notificationsService: NotificationsService,
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

  async findOrCreateSkill(
    name: string,
    category: string,
    organizationId: number,
  ): Promise<Skill> {
    const normalizedName = name.toLowerCase().trim();

    let skill = await this.skillRepository.findOne({
      where: {
        name: normalizedName,
        organizationId,
      },
    });

    if (!skill) {
      skill = this.skillRepository.create({
        name: normalizedName,
        category,
        organizationId,
        usageCount: 0,
      });
      skill = await this.skillRepository.save(skill);
      this.logger.log(`Compétence créée: ${normalizedName}`);
    }

    return skill;
  }

  async extractAndAssociateSkills(
    text: string,
    candidateId: number,
    documentId: number | null,
    organizationId: number,
  ): Promise<CandidateSkill[]> {
    const extractedSkills = this.skillsExtractionService.extractSkills(text);
    const candidateSkills: CandidateSkill[] = [];

    for (const extracted of extractedSkills) {
      const skill = await this.findOrCreateSkill(
        extracted.name,
        extracted.category,
        organizationId,
      );
      const existing = await this.candidateSkillRepository.findOne({
        where: {
          candidateId,
          skillId: skill.id,
          documentId: documentId || undefined,
        },
      });

      if (!existing) {
        const candidateSkill = this.candidateSkillRepository.create({
          candidateId,
          skillId: skill.id,
          documentId: documentId || undefined,
          confidence: extracted.confidence,
        });

        const saved = await this.candidateSkillRepository.save(candidateSkill);

        skill.usageCount += 1;
        await this.skillRepository.save(skill);

        candidateSkills.push(saved);
      } else if (existing.confidence < extracted.confidence) {
        existing.confidence = extracted.confidence;
        await this.candidateSkillRepository.save(existing);
        candidateSkills.push(existing);
      }
    }

    this.logger.log(
      `${candidateSkills.length} compétences associées au candidat ${candidateId}`,
    );

    if (candidateSkills.length > 0) {
      try {
        const candidate = await this.candidateRepository.findOne({
          where: { id: candidateId },
        });

        if (candidate) {
          const rhUsers = await this.userOrganizationRepository.find({
            where: {
              organizationId,
              role: In([Role.ADMIN, Role.RH, Role.MANAGER]),
            },
            relations: ['user'],
          });

          const userIds = rhUsers
            .map((uo) => uo.user?.id)
            .filter((id): id is number => id !== undefined);

          if (userIds.length > 0) {
            await this.notificationsService.createAndSend(
              NotificationType.SKILLS_EXTRACTED,
              'Compétences extraites',
              `${candidateSkills.length} compétence(s) extraite(s) pour ${candidate.firstName} ${candidate.lastName}`,
              organizationId,
              userIds,
              {
                candidateId: candidate.id,
                skillsCount: candidateSkills.length,
                documentId: documentId ?? undefined,
              } as {
                candidateId: number;
                skillsCount: number;
                documentId?: number;
              },
            );
          }
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Erreur inconnue';
        this.logger.warn(
          `Erreur lors de l'envoi de la notification d'extraction: ${errorMessage}`,
        );
      }
    }

    return candidateSkills;
  }

  async create(
    createSkillDto: CreateSkillDto,
    organizationId: number,
    userId: number,
  ): Promise<Skill> {
    await this.checkOrganizationAccess(organizationId, userId);

    const normalizedName = createSkillDto.name.toLowerCase().trim();

    const existing = await this.skillRepository.findOne({
      where: {
        name: normalizedName,
        organizationId,
      },
    });

    if (existing) {
      return existing;
    }

    const skill = this.skillRepository.create({
      name: normalizedName,
      description: createSkillDto.description,
      category: createSkillDto.category || 'technique',
      organizationId,
      usageCount: 0,
    });

    return this.skillRepository.save(skill);
  }

  async findAll(
    organizationId: number,
    userId: number,
    category?: string,
  ): Promise<Skill[]> {
    await this.checkOrganizationAccess(organizationId, userId);

    const where: Partial<Skill> & { organizationId: number } = {
      organizationId,
    };
    if (category) {
      where.category = category;
    }

    return this.skillRepository.find({
      where,
      order: { usageCount: 'DESC', name: 'ASC' },
    });
  }

  async findOne(
    id: number,
    organizationId: number,
    userId: number,
  ): Promise<Skill> {
    await this.checkOrganizationAccess(organizationId, userId);

    const skill = await this.skillRepository.findOne({
      where: { id, organizationId },
    });

    if (!skill) {
      throw new NotFoundException('Compétence introuvable');
    }

    return skill;
  }

  async update(
    id: number,
    updateSkillDto: UpdateSkillDto,
    organizationId: number,
    userId: number,
  ): Promise<Skill> {
    await this.checkOrganizationAccess(organizationId, userId, [
      Role.ADMIN,
      Role.MANAGER,
    ]);

    const skill = await this.findOne(id, organizationId, userId);

    if (updateSkillDto.name) {
      skill.name = updateSkillDto.name.toLowerCase().trim();
    }
    if (updateSkillDto.description !== undefined) {
      skill.description = updateSkillDto.description;
    }
    if (updateSkillDto.category) {
      skill.category = updateSkillDto.category;
    }

    return this.skillRepository.save(skill);
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

    const skill = await this.findOne(id, organizationId, userId);

    await this.candidateSkillRepository.delete({ skillId: id });

    await this.skillRepository.remove(skill);

    return { message: 'Compétence supprimée avec succès' };
  }

  async getCandidateSkills(
    candidateId: number,
    organizationId: number,
    userId: number,
  ): Promise<CandidateSkill[]> {
    await this.checkOrganizationAccess(organizationId, userId);

    const candidate = await this.candidateRepository.findOne({
      where: { id: candidateId, organizationId },
    });

    if (!candidate) {
      throw new NotFoundException('Candidat introuvable');
    }

    return this.candidateSkillRepository.find({
      where: { candidateId },
      relations: ['skill', 'document'],
      order: { confidence: 'DESC' },
    });
  }

  async findCandidatesBySkills(
    skillIds: number[],
    organizationId: number,
    userId: number,
  ): Promise<Candidate[]> {
    await this.checkOrganizationAccess(organizationId, userId);

    const candidateSkills = await this.candidateSkillRepository.find({
      where: {
        skillId: In(skillIds),
      },
      relations: ['candidate'],
    });

    // Filtrer par organisation et dédupliquer
    const candidateIds = new Set<number>();
    for (const cs of candidateSkills) {
      if (cs.candidate.organizationId === organizationId) {
        candidateIds.add(cs.candidateId);
      }
    }

    if (candidateIds.size === 0) {
      return [];
    }

    return this.candidateRepository.find({
      where: {
        id: In(Array.from(candidateIds)),
        organizationId,
      },
      relations: ['jobOffer', 'form'],
    });
  }

  async removeCandidateSkill(
    candidateId: number,
    skillId: number,
    organizationId: number,
    userId: number,
  ): Promise<{ message: string }> {
    await this.checkOrganizationAccess(organizationId, userId, [
      Role.ADMIN,
      Role.MANAGER,
    ]);

    const candidateSkill = await this.candidateSkillRepository.findOne({
      where: { candidateId, skillId },
      relations: ['candidate', 'skill'],
    });

    if (!candidateSkill) {
      throw new NotFoundException('Association introuvable');
    }

    if (candidateSkill.candidate.organizationId !== organizationId) {
      throw new ForbiddenException(
        "Cette association n'appartient pas à votre organisation",
      );
    }

    await this.candidateSkillRepository.remove(candidateSkill);
    const skill = candidateSkill.skill;
    if (skill.usageCount > 0) {
      skill.usageCount -= 1;
      await this.skillRepository.save(skill);
    }

    return { message: 'Association supprimée avec succès' };
  }

  async associateSkillToCandidate(
    candidateId: number,
    skillId: number,
    organizationId: number,
    userId: number,
    confidence?: number,
  ): Promise<CandidateSkill> {
    await this.checkOrganizationAccess(organizationId, userId, [
      Role.ADMIN,
      Role.MANAGER,
    ]);

    const candidate = await this.candidateRepository.findOne({
      where: { id: candidateId, organizationId },
    });

    if (!candidate) {
      throw new NotFoundException('Candidat introuvable');
    }

    const skill = await this.skillRepository.findOne({
      where: { id: skillId, organizationId },
    });

    if (!skill) {
      throw new NotFoundException('Compétence introuvable');
    }

    const existing = await this.candidateSkillRepository.findOne({
      where: {
        candidateId,
        skillId,
      },
    });

    if (existing) {
      if (confidence !== undefined) {
        existing.confidence = confidence;
        return this.candidateSkillRepository.save(existing);
      }
      return existing;
    }

    const candidateSkill = this.candidateSkillRepository.create({
      candidateId,
      skillId,
      confidence: confidence || 1.0,
      documentId: undefined,
    });

    const saved = await this.candidateSkillRepository.save(candidateSkill);

    skill.usageCount += 1;
    await this.skillRepository.save(skill);

    // Notifier les ADMIN et MANAGER de l'association manuelle
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
          NotificationType.SKILL_ASSOCIATED,
          'Compétence associée manuellement',
          `La compétence "${skill.name}" a été associée à ${candidate.firstName} ${candidate.lastName}`,
          organizationId,
          userIds,
          {
            candidateId: candidate.id,
            skillId: skill.id,
          } as {
            candidateId: number;
            skillId: number;
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

    return saved;
  }
}
