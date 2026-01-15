/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from '../auth/dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import type { RequestWithUser } from '../common/interfaces/user-request.interface';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: "Récupérer les utilisateurs de l'organisation de l'admin",
  })
  @ApiResponse({ status: 200, description: 'Liste des utilisateurs' })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé - Admin ou Manager requis',
  })
  async findAll(@Request() req: RequestWithUser) {
    return await this.usersService.findAll(req.user.id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Créer un nouvel utilisateur (réservé à l'admin)" })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'Utilisateur créé avec succès' })
  @ApiResponse({ status: 403, description: 'Accès refusé - Admin requis' })
  async create(
    @Body() createUserDto: CreateUserDto,
    @Request() req: RequestWithUser,
  ) {
    return await this.usersService.create(createUserDto, req.user.id);
  }

  @Get('me')
  @ApiOperation({
    summary: "Récupérer les informations de l'utilisateur connecté",
  })
  @ApiResponse({ status: 200, description: "Informations de l'utilisateur" })
  async getMe(@Request() req: RequestWithUser) {
    return await this.usersService.findOne(req.user.sub);
  }

  @Get('role/:role')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Récupérer les utilisateurs par rôle' })
  @ApiParam({ name: 'role', enum: Role })
  @ApiResponse({
    status: 200,
    description: 'Liste des utilisateurs avec ce rôle',
  })
  async getUsersByRole(@Param('role') role: Role) {
    return await this.usersService.getUsersByRole(role);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Récupérer un utilisateur par son ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Utilisateur trouvé' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.usersService.findOne(id);
  }

  @Put('me')
  @ApiOperation({
    summary: "Modifier les informations de l'utilisateur connecté",
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'Utilisateur modifié avec succès' })
  async updateMe(
    @Request() req: RequestWithUser,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return await this.usersService.update(req.user.sub, updateUserDto);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Modifier un utilisateur' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'Utilisateur modifié avec succès' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return await this.usersService.update(id, updateUserDto);
  }

  @Put('me/password')
  @ApiOperation({
    summary: "Modifier le mot de passe de l'utilisateur connecté",
  })
  @ApiBody({ type: UpdatePasswordDto })
  @ApiResponse({ status: 200, description: 'Mot de passe modifié avec succès' })
  @ApiResponse({ status: 400, description: 'Mot de passe actuel incorrect' })
  async updateMyPassword(
    @Request() req: RequestWithUser,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    return await this.usersService.updatePassword(
      req.user.sub,
      updatePasswordDto,
    );
  }

  @Put(':id/role')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Changer le rôle d'un utilisateur" })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: ChangeRoleDto })
  @ApiResponse({ status: 200, description: 'Rôle modifié avec succès' })
  @ApiResponse({ status: 403, description: 'Accès refusé - Admin requis' })
  async changeRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() changeRoleDto: ChangeRoleDto,
    @Request() req: RequestWithUser,
  ) {
    return await this.usersService.changeRole(id, changeRoleDto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Supprimer un utilisateur' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Utilisateur supprimé avec succès' })
  @ApiResponse({ status: 403, description: 'Accès refusé - Admin requis' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequestWithUser,
  ) {
    return await this.usersService.remove(id, req.user.id);
  }

  @Put(':id/activate')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Activer un compte utilisateur' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Utilisateur activé avec succès' })
  @ApiResponse({ status: 403, description: 'Accès refusé - Admin requis' })
  async activate(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequestWithUser,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
    return await this.usersService.activateUser(id, req.user.id);
  }

  @Put(':id/deactivate')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Désactiver un compte utilisateur' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Utilisateur désactivé avec succès',
  })
  @ApiResponse({ status: 403, description: 'Accès refusé - Admin requis' })
  async deactivate(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequestWithUser,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    return await this.usersService.deactivateUser(id, req.user.id);
  }
}
