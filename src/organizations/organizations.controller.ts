import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { AssignUserDto } from './dto/assign-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../common/interfaces/user-request.interface';

@ApiTags('organizations')
@ApiBearerAuth('JWT-auth')
@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Créer une nouvelle organisation' })
  @ApiBody({ type: CreateOrganizationDto })
  @ApiResponse({ status: 201, description: 'Organisation créée avec succès' })
  create(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @Request() req: RequestWithUser,
  ) {
    return this.organizationsService.create(createOrganizationDto, req.user.id);
  }

  @Get()
  @ApiOperation({
    summary: "Récupérer toutes les organisations de l'utilisateur",
  })
  @ApiResponse({ status: 200, description: 'Liste des organisations' })
  findAll(@Request() req: RequestWithUser) {
    return this.organizationsService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une organisation par son ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Organisation trouvée' })
  @ApiResponse({ status: 404, description: 'Organisation introuvable' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequestWithUser,
  ) {
    return this.organizationsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier une organisation' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateOrganizationDto })
  @ApiResponse({
    status: 200,
    description: 'Organisation modifiée avec succès',
  })
  @ApiResponse({ status: 403, description: 'Accès refusé - Admin requis' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @Request() req: RequestWithUser,
  ) {
    return this.organizationsService.update(
      id,
      updateOrganizationDto,
      req.user.id,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une organisation' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Organisation supprimée avec succès',
  })
  @ApiResponse({ status: 403, description: 'Accès refusé - Admin requis' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequestWithUser,
  ) {
    return this.organizationsService.remove(id, req.user.id);
  }

  @Post(':id/users')
  @ApiOperation({ summary: 'Ajouter un utilisateur à une organisation' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: AssignUserDto })
  @ApiResponse({ status: 201, description: 'Utilisateur ajouté avec succès' })
  @ApiResponse({ status: 403, description: 'Accès refusé - Admin requis' })
  assignUser(
    @Param('id', ParseIntPipe) organizationId: number,
    @Body() assignUserDto: AssignUserDto,
    @Request() req: RequestWithUser,
  ) {
    return this.organizationsService.assignUserToOrganization(
      organizationId,
      assignUserDto,
      req.user.id,
    );
  }

  @Delete(':id/users/:userId')
  @ApiOperation({ summary: "Retirer un utilisateur d'une organisation" })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'userId', type: Number })
  @ApiResponse({ status: 200, description: 'Utilisateur retiré avec succès' })
  @ApiResponse({ status: 403, description: 'Accès refusé - Admin requis' })
  removeUser(
    @Param('id', ParseIntPipe) organizationId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.organizationsService.removeUserFromOrganization(
      organizationId,
      userId,
      req.user.id,
    );
  }

  @Get(':id/users')
  @ApiOperation({
    summary: "Récupérer tous les utilisateurs d'une organisation",
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Liste des utilisateurs' })
  getOrganizationUsers(
    @Param('id', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.organizationsService.getOrganizationUsers(
      organizationId,
      req.user.id,
    );
  }

  @Get(':id/debug')
  @ApiOperation({
    summary: 'Debug - Informations de débogage pour une organisation',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Informations de débogage' })
  async debugOrganization(
    @Param('id', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.organizationsService.debugUserOrganization(
      organizationId,
      req.user.id,
    );
  }
}
