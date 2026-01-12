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
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { SkillsService } from './skills.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { AssociateSkillDto } from './dto/associate-skill.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import type { RequestWithUser } from '../common/interfaces/user-request.interface';

@ApiTags('skills')
@ApiBearerAuth('JWT-auth')
@Controller('skills')
@UseGuards(JwtAuthGuard)
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.RH, Role.MANAGER)
  @ApiOperation({ summary: 'Créer une nouvelle compétence' })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiBody({ type: CreateSkillDto })
  @ApiResponse({ status: 201, description: 'Compétence créée avec succès' })
  create(
    @Body() createSkillDto: CreateSkillDto,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.skillsService.create(
      createSkillDto,
      organizationId,
      req.user.id,
    );
  }

  @Get()
  @ApiOperation({
    summary: "Récupérer toutes les compétences d'une organisation",
  })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiQuery({ name: 'category', type: String, required: false })
  @ApiResponse({ status: 200, description: 'Liste des compétences' })
  findAll(
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Query('category') category: string,
    @Request() req: RequestWithUser,
  ) {
    return this.skillsService.findAll(organizationId, req.user.id, category);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une compétence par son ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiResponse({ status: 200, description: 'Compétence trouvée' })
  @ApiResponse({ status: 404, description: 'Compétence introuvable' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.skillsService.findOne(id, organizationId, req.user.id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.RH, Role.MANAGER)
  @ApiOperation({ summary: 'Modifier une compétence' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiBody({ type: UpdateSkillDto })
  @ApiResponse({ status: 200, description: 'Compétence modifiée avec succès' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSkillDto: UpdateSkillDto,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.skillsService.update(
      id,
      updateSkillDto,
      organizationId,
      req.user.id,
    );
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.RH, Role.MANAGER)
  @ApiOperation({ summary: 'Supprimer une compétence' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiResponse({ status: 200, description: 'Compétence supprimée avec succès' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.skillsService.remove(id, organizationId, req.user.id);
  }

  @Get('candidates/:candidateId')
  @ApiOperation({ summary: "Récupérer toutes les compétences d'un candidat" })
  @ApiParam({ name: 'candidateId', type: Number })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiResponse({
    status: 200,
    description: 'Liste des compétences du candidat',
  })
  getCandidateSkills(
    @Param('candidateId', ParseIntPipe) candidateId: number,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.skillsService.getCandidateSkills(
      candidateId,
      organizationId,
      req.user.id,
    );
  }

  @Post('search/candidates')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.RH, Role.MANAGER, Role.CANDIDATE)
  @ApiOperation({ summary: 'Rechercher des candidats par compétences' })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        skillIds: {
          type: 'array',
          items: { type: 'number' },
          description: 'Liste des IDs de compétences',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des candidats correspondants',
  })
  findCandidatesBySkills(
    @Body() body: { skillIds: number[] },
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.skillsService.findCandidatesBySkills(
      body.skillIds,
      organizationId,
      req.user.id,
    );
  }

  @Post('candidates/:candidateId/skills')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.RH, Role.MANAGER)
  @ApiOperation({ summary: 'Associer une compétence à un candidat' })
  @ApiParam({ name: 'candidateId', type: Number })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiBody({ type: AssociateSkillDto })
  @ApiResponse({ status: 201, description: 'Compétence associée avec succès' })
  associateSkillToCandidate(
    @Param('candidateId', ParseIntPipe) candidateId: number,
    @Body() associateSkillDto: AssociateSkillDto,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.skillsService.associateSkillToCandidate(
      candidateId,
      associateSkillDto.skillId,
      organizationId,
      req.user.id,
      associateSkillDto.confidence,
    );
  }

  @Delete('candidates/:candidateId/skills/:skillId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.RH, Role.MANAGER)
  @ApiOperation({ summary: "Retirer une compétence d'un candidat" })
  @ApiParam({ name: 'candidateId', type: Number })
  @ApiParam({ name: 'skillId', type: Number })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiResponse({ status: 200, description: 'Compétence retirée avec succès' })
  removeCandidateSkill(
    @Param('candidateId', ParseIntPipe) candidateId: number,
    @Param('skillId', ParseIntPipe) skillId: number,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.skillsService.removeCandidateSkill(
      candidateId,
      skillId,
      organizationId,
      req.user.id,
    );
  }
}
