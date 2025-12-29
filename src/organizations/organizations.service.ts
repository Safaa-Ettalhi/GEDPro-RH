import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { UserOrganization } from './entities/user-organization.entity';
import { User } from '../auth/entities/user.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { AssignUserDto } from './dto/assign-user.dto';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(UserOrganization)
    private userOrganizationRepository: Repository<UserOrganization>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(
    createOrganizationDto: CreateOrganizationDto,
    creatorId: number,
  ): Promise<Organization> {
    const organization = this.organizationRepository.create(
      createOrganizationDto,
    );
    const savedOrganization =
      await this.organizationRepository.save(organization);

    const userOrganization = this.userOrganizationRepository.create({
      userId: creatorId,
      organizationId: savedOrganization.id,
      role: Role.ADMIN,
    });
    await this.userOrganizationRepository.save(userOrganization);

    return savedOrganization;
  }

  async findAll(userId: number): Promise<Organization[]> {
    const userOrganizations = await this.userOrganizationRepository.find({
      where: { userId },
      relations: ['organization'],
    });

    return userOrganizations.map((uo) => uo.organization);
  }

  async findOne(
    id: number,
    userId: number,
  ): Promise<Organization & { userRole: Role }> {
    const userOrg = await this.userOrganizationRepository.findOne({
      where: { organizationId: id, userId },
      relations: ['organization'],
    });

    if (!userOrg) {
      throw new NotFoundException(
        "Organisation introuvable ou vous n'y avez pas accès",
      );
    }

    return {
      ...userOrg.organization,
      userRole: userOrg.role,
    };
  }

  async update(
    id: number,
    updateOrganizationDto: UpdateOrganizationDto,
    userId: number,
  ): Promise<Organization> {
    const userOrg = await this.userOrganizationRepository.findOne({
      where: { organizationId: id, userId },
    });

    if (!userOrg) {
      throw new ForbiddenException(
        "Vous n'appartenez pas à cette organisation",
      );
    }

    const userRole = String(userOrg.role).trim().toLowerCase();
    const adminRole = String(Role.ADMIN).trim().toLowerCase();

    if (userRole !== adminRole) {
      throw new ForbiddenException(
        `Vous devez être administrateur de l'organisation pour effectuer cette action. Votre rôle: ${userOrg.role}, Requis: ${Role.ADMIN}`,
      );
    }

    const organization = await this.organizationRepository.findOne({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException('Organisation introuvable');
    }

    Object.assign(organization, updateOrganizationDto);
    return this.organizationRepository.save(organization);
  }

  async remove(id: number, userId: number): Promise<{ message: string }> {
    const userOrg = await this.userOrganizationRepository.findOne({
      where: { organizationId: id, userId },
    });

    if (!userOrg) {
      throw new ForbiddenException(
        "Vous n'appartenez pas à cette organisation",
      );
    }

    const userRole = String(userOrg.role).trim().toLowerCase();
    const adminRole = String(Role.ADMIN).trim().toLowerCase();

    if (userRole !== adminRole) {
      throw new ForbiddenException(
        `Vous devez être administrateur de l'organisation pour effectuer cette action. Votre rôle: ${userOrg.role}, Requis: ${Role.ADMIN}`,
      );
    }

    const organization = await this.organizationRepository.findOne({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException('Organisation introuvable');
    }

    await this.organizationRepository.remove(organization);
    return { message: 'Organisation supprimée avec succès' };
  }

  async assignUserToOrganization(
    organizationId: number,
    assignUserDto: AssignUserDto,
    currentUserId: number,
  ): Promise<UserOrganization> {
    // Vérifier que l'utilisateur actuel est admin de l'organisation
    const currentUserOrg = await this.userOrganizationRepository.findOne({
      where: { organizationId, userId: currentUserId },
    });

    if (!currentUserOrg) {
      throw new ForbiddenException(
        "Vous n'appartenez pas à cette organisation",
      );
    }

    // Vérifier le rôle - comparaison robuste
    const userRole = String(currentUserOrg.role).trim().toLowerCase();
    const adminRole = String(Role.ADMIN).trim().toLowerCase();

    if (userRole !== adminRole) {
      throw new ForbiddenException(
        `Vous devez être administrateur de l'organisation pour effectuer cette action. Votre rôle: ${currentUserOrg.role}, Requis: ${Role.ADMIN}`,
      );
    }

    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organisation introuvable');
    }

    const user = await this.userRepository.findOne({
      where: { id: assignUserDto.userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const existingUserOrg = await this.userOrganizationRepository.findOne({
      where: {
        organizationId,
        userId: assignUserDto.userId,
      },
    });

    if (existingUserOrg) {
      // Mettre à jour le rôle si l'utilisateur est déjà dans l'organisation
      existingUserOrg.role = assignUserDto.role;
      return this.userOrganizationRepository.save(existingUserOrg);
    }

    // Créer la relation
    const userOrganization = this.userOrganizationRepository.create({
      userId: assignUserDto.userId,
      organizationId,
      role: assignUserDto.role,
    });

    return this.userOrganizationRepository.save(userOrganization);
  }

  async removeUserFromOrganization(
    organizationId: number,
    userIdToRemove: number,
    currentUserId: number,
  ): Promise<{ message: string }> {
    const currentUserOrg = await this.userOrganizationRepository.findOne({
      where: { organizationId, userId: currentUserId },
    });

    if (!currentUserOrg) {
      throw new ForbiddenException(
        "Vous n'appartenez pas à cette organisation",
      );
    }

    // Vérifier le rôle - comparaison robuste
    const userRole = String(currentUserOrg.role).trim().toLowerCase();
    const adminRole = String(Role.ADMIN).trim().toLowerCase();

    if (userRole !== adminRole) {
      throw new ForbiddenException(
        `Vous devez être administrateur de l'organisation pour effectuer cette action. Votre rôle: ${currentUserOrg.role}, Requis: ${Role.ADMIN}`,
      );
    }

    // Empêcher de se retirer soi-même si on est le seul admin
    if (userIdToRemove === currentUserId) {
      const adminCount = await this.userOrganizationRepository.count({
        where: { organizationId, role: Role.ADMIN },
      });

      if (adminCount === 1) {
        throw new BadRequestException(
          "Vous ne pouvez pas vous retirer de l'organisation car vous êtes le seul administrateur",
        );
      }
    }

    const userOrg = await this.userOrganizationRepository.findOne({
      where: { organizationId, userId: userIdToRemove },
    });

    if (!userOrg) {
      throw new NotFoundException(
        "L'utilisateur n'appartient pas à cette organisation",
      );
    }

    await this.userOrganizationRepository.remove(userOrg);
    return { message: "Utilisateur retiré de l'organisation avec succès" };
  }

  async getOrganizationUsers(
    organizationId: number,
    currentUserId: number,
  ): Promise<(User & { roleInOrg: Role; joinedAt: Date })[]> {
    // Vérifier que l'utilisateur a accès à l'organisation
    const userOrg = await this.userOrganizationRepository.findOne({
      where: { organizationId, userId: currentUserId },
    });

    if (!userOrg) {
      throw new ForbiddenException(
        "Vous n'avez pas accès à cette organisation",
      );
    }

    const userOrganizations = await this.userOrganizationRepository.find({
      where: { organizationId },
      relations: ['user'],
    });

    return userOrganizations.map((uo) => ({
      ...uo.user,
      roleInOrg: uo.role,
      joinedAt: uo.joinedAt,
    }));
  }

  async getUserOrganizations(userId: number): Promise<Organization[]> {
    const userOrganizations = await this.userOrganizationRepository.find({
      where: { userId },
      relations: ['organization'],
    });

    return userOrganizations.map((uo) => uo.organization);
  }

  async getCurrentUserOrganization(
    userId: number,
  ): Promise<Organization | null> {
    const userOrg = await this.userOrganizationRepository.findOne({
      where: { userId },
      relations: ['organization'],
      order: { joinedAt: 'DESC' },
    });

    return userOrg ? userOrg.organization : null;
  }

  async debugUserOrganization(
    organizationId: number,
    userId: number,
  ): Promise<{
    found: boolean;
    userOrg: UserOrganization | null;
    role: string | null;
    roleMatches: boolean;
    allUserOrgs: UserOrganization[];
  }> {
    const userOrg = await this.userOrganizationRepository.findOne({
      where: { organizationId, userId },
    });

    const allUserOrgs = await this.userOrganizationRepository.find({
      where: { userId },
    });

    return {
      found: !!userOrg,
      userOrg: userOrg || null,
      role: userOrg?.role || null,
      roleMatches: userOrg
        ? String(userOrg.role).trim().toLowerCase() ===
          String(Role.ADMIN).trim().toLowerCase()
        : false,
      allUserOrgs,
    };
  }
}
