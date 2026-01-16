import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../auth/entities/user.entity';
import { CreateUserDto } from '../auth/dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import { Role } from '../common/enums/role.enum';
import { UserOrganization } from '../organizations/entities/user-organization.entity';
import { Organization } from '../organizations/entities/organization.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserOrganization)
    private userOrganizationRepository: Repository<UserOrganization>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
  ) {}

  async findAll(currentUserId: number): Promise<Omit<User, 'password'>[]> {
    // Récupérer l'organisation de l'utilisateur actuel
    const currentUserOrg = await this.userOrganizationRepository.findOne({
      where: { userId: currentUserId },
      relations: ['organization'],
    });

    if (!currentUserOrg) {
      return [];
    }

    // Récupérer tous les utilisateurs de cette organisation
    const userOrgs = await this.userOrganizationRepository.find({
      where: { organizationId: currentUserOrg.organizationId },
      relations: ['user', 'organization'],
    });

    const userIds = userOrgs
      .map((uo) => uo.userId)
      .filter((id): id is number => id !== undefined);

    if (userIds.length === 0) {
      return [];
    }

    const users = await this.userRepository.find({
      where: { id: In(userIds) },
      relations: ['userOrganizations', 'userOrganizations.organization'],
      order: { createdAt: 'DESC' },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return users.map(({ password, ...user }) => user);
  }

  async create(
    createUserDto: CreateUserDto,
    creatorUserId: number,
    creatorRole?: Role,
  ): Promise<Omit<User, 'password'>> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Cet email existe déjà');
    }

    if (creatorRole === Role.RH) {
      if (
        createUserDto.role === Role.ADMIN ||
        createUserDto.role === Role.RH ||
        createUserDto.role === Role.CANDIDATE
      ) {
        throw new ForbiddenException(
          "Vous n'êtes pas autorisé à créer des administrateurs, des RH ou des candidats. Vous pouvez uniquement créer des managers.",
        );
      }
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = this.userRepository.create({
      name: createUserDto.name,
      email: createUserDto.email,
      role: createUserDto.role || Role.CANDIDATE,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);
    const creatorUserOrg = await this.userOrganizationRepository.findOne({
      where: { userId: creatorUserId },
      relations: ['organization'],
    });

    if (creatorUserOrg && creatorUserOrg.organization) {
      const existingUserOrg = await this.userOrganizationRepository.findOne({
        where: {
          userId: savedUser.id,
          organizationId: creatorUserOrg.organizationId,
        },
      });

      if (!existingUserOrg) {
        const userOrganization = this.userOrganizationRepository.create({
          userId: savedUser.id,
          organizationId: creatorUserOrg.organizationId,
          role: createUserDto.role || Role.CANDIDATE,
        });
        await this.userOrganizationRepository.save(userOrganization);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = savedUser;
    return userWithoutPassword;
  }

  async findOne(id: number): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['userOrganizations', 'userOrganizations.organization'],
    });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
  ): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    // Vérifier si l'email existe déjà (sauf pour l'utilisateur actuel)
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.findByEmail(updateUserDto.email);
      if (existingUser && existingUser.id !== id) {
        throw new BadRequestException('Cet email est déjà utilisé');
      }
    }

    Object.assign(user, updateUserDto);
    const updatedUser = await this.userRepository.save(user);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async updatePassword(
    id: number,
    updatePasswordDto: UpdatePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const isPasswordValid = await bcrypt.compare(
      updatePasswordDto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Mot de passe actuel incorrect');
    }

    const hashedPassword = await bcrypt.hash(updatePasswordDto.newPassword, 10);
    user.password = hashedPassword;
    await this.userRepository.save(user);

    return { message: 'Mot de passe modifié avec succès' };
  }

  async changeRole(
    id: number,
    changeRoleDto: ChangeRoleDto,
    adminUserId: number,
  ): Promise<Omit<User, 'password'>> {
    const adminUserOrg = await this.userOrganizationRepository.findOne({
      where: { userId: adminUserId },
    });

    if (!adminUserOrg) {
      throw new ForbiddenException("Vous n'appartenez à aucune organisation");
    }

    const targetUserOrg = await this.userOrganizationRepository.findOne({
      where: {
        userId: id,
        organizationId: adminUserOrg.organizationId,
      },
    });

    if (!targetUserOrg) {
      throw new ForbiddenException(
        "Cet utilisateur n'appartient pas à votre organisation",
      );
    }

    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    user.role = changeRoleDto.role;
    const updatedUser = await this.userRepository.save(user);

    targetUserOrg.role = changeRoleDto.role;
    await this.userOrganizationRepository.save(targetUserOrg);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async remove(
    id: number,
    currentUserId: number,
  ): Promise<{ message: string }> {
    if (id === currentUserId) {
      throw new BadRequestException(
        'Vous ne pouvez pas supprimer votre propre compte',
      );
    }

    const adminUserOrg = await this.userOrganizationRepository.findOne({
      where: { userId: currentUserId },
    });

    if (!adminUserOrg) {
      throw new ForbiddenException("Vous n'appartenez à aucune organisation");
    }

    const targetUserOrg = await this.userOrganizationRepository.findOne({
      where: {
        userId: id,
        organizationId: adminUserOrg.organizationId,
      },
    });

    if (!targetUserOrg) {
      throw new ForbiddenException(
        "Cet utilisateur n'appartient pas à votre organisation",
      );
    }

    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    await this.userRepository.remove(user);
    return { message: 'Utilisateur supprimé avec succès' };
  }

  async getUsersByRole(role: Role): Promise<Omit<User, 'password'>[]> {
    const users = await this.userRepository.find({
      where: { role },
      relations: ['userOrganizations', 'userOrganizations.organization'],
      order: { createdAt: 'DESC' },
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return users.map(({ password, ...user }) => user);
  }

  async activateUser(
    id: number,
    adminUserId: number,
  ): Promise<Omit<User, 'password'>> {
    const adminUserOrg = await this.userOrganizationRepository.findOne({
      where: { userId: adminUserId },
    });

    if (!adminUserOrg) {
      throw new ForbiddenException("Vous n'appartenez à aucune organisation");
    }

    const targetUserOrg = await this.userOrganizationRepository.findOne({
      where: {
        userId: id,
        organizationId: adminUserOrg.organizationId,
      },
    });

    if (!targetUserOrg) {
      throw new ForbiddenException(
        "Cet utilisateur n'appartient pas à votre organisation",
      );
    }

    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    user.isActive = true;
    const updatedUser = await this.userRepository.save(user);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async deactivateUser(
    id: number,
    adminUserId: number,
  ): Promise<Omit<User, 'password'>> {
    if (id === adminUserId) {
      throw new BadRequestException(
        'Vous ne pouvez pas désactiver votre propre compte',
      );
    }

    const adminUserOrg = await this.userOrganizationRepository.findOne({
      where: { userId: adminUserId },
    });

    if (!adminUserOrg) {
      throw new ForbiddenException("Vous n'appartenez à aucune organisation");
    }

    const targetUserOrg = await this.userOrganizationRepository.findOne({
      where: {
        userId: id,
        organizationId: adminUserOrg.organizationId,
      },
    });

    if (!targetUserOrg) {
      throw new ForbiddenException(
        "Cet utilisateur n'appartient pas à votre organisation",
      );
    }

    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    user.isActive = false;
    const updatedUser = await this.userRepository.save(user);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }
}
