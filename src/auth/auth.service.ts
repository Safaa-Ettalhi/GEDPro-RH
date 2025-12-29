import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Session, SessionDocument } from './schemas/session.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { Role } from '../common/enums/role.enum';
import { Organization } from '../organizations/entities/organization.entity';
import { UserOrganization } from '../organizations/entities/user-organization.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(UserOrganization)
    private userOrganizationRepository: Repository<UserOrganization>,
    @InjectModel(Session.name)
    private sessionModel: Model<SessionDocument>,
    private jwtService: JwtService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new UnauthorizedException('Cet email existe déjà!');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = this.userRepository.create({
      name: createUserDto.name,
      email: createUserDto.email,
      role: createUserDto.role || Role.USER,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);

    // Créer une organisation par défaut pour le nouvel utilisateur
    const defaultOrganization = this.organizationRepository.create({
      name: `${createUserDto.name}'s Organization`,
      description: 'Organisation par défaut',
    });
    const savedOrganization =
      await this.organizationRepository.save(defaultOrganization);

    // Associer l'utilisateur à l'organisation en tant qu'admin
    const userOrganization = this.userOrganizationRepository.create({
      userId: savedUser.id,
      organizationId: savedOrganization.id,
      role: Role.ADMIN,
    });
    await this.userOrganizationRepository.save(userOrganization);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = savedUser;
    return result;
  }

  async login(loginDto: LoginDto) {
    try {
      const user = await this.userRepository.findOne({
        where: { email: loginDto.email },
      });

      if (!user) {
        throw new UnauthorizedException('Email ou mot de passe incorrect!');
      }

      const isPasswordValid = await bcrypt.compare(
        loginDto.password,
        user.password,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException('Email ou mot de passe incorrect!');
      }

      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };

      const accessToken = this.jwtService.sign(payload);

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      try {
        await this.sessionModel.create({
          userId: user.id,
          token: accessToken,
          expiresAt,
        });
      } catch (sessionError) {
        console.error('Erreur lors de la création de session:', sessionError);
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = user;
      return {
        accessToken,
        user: userWithoutPassword,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('Erreur lors du login:', error);
      throw new UnauthorizedException('Erreur lors de la connexion');
    }
  }

  async validateToken(token: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);

      const session = await this.sessionModel.findOne({ token });
      if (!session) {
        throw new UnauthorizedException('Session introuvable!');
      }

      if (new Date() > session.expiresAt) {
        throw new UnauthorizedException('Session expirée!');
      }

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('Utilisateur introuvable!');
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch {
      throw new UnauthorizedException('Token invalide ou expiré!');
    }
  }

  async logout(token: string) {
    await this.sessionModel.deleteOne({ token });
    return { message: 'Déconnexion réussie' };
  }
}
