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
import { InterviewsService } from './interviews.service';
import { GoogleCalendarService } from './services/google-calendar.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { InterviewStatus } from '../common/enums/interview-status.enum';
import type { RequestWithUser } from '../common/interfaces/user-request.interface';

@ApiTags('interviews')
@ApiBearerAuth('JWT-auth')
@Controller('interviews')
@UseGuards(JwtAuthGuard)
export class InterviewsController {
  constructor(
    private readonly interviewsService: InterviewsService,
    private readonly googleCalendarService: GoogleCalendarService,
  ) { }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.RH)
  @ApiOperation({ summary: 'Créer un nouvel entretien' })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiBody({ type: CreateInterviewDto })
  @ApiResponse({ status: 201, description: 'Entretien créé avec succès' })
  @ApiResponse({ status: 400, description: 'Date invalide ou dans le passé' })
  @ApiResponse({ status: 404, description: 'Candidat introuvable' })
  create(
    @Body() createInterviewDto: CreateInterviewDto,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.interviewsService.create(
      createInterviewDto,
      organizationId,
      req.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: "Récupérer tous les entretiens d'une organisation" })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiQuery({ name: 'candidateId', type: Number, required: false })
  @ApiQuery({ name: 'status', enum: InterviewStatus, required: false })
  @ApiQuery({
    name: 'dateFrom',
    type: String,
    required: false,
    description: 'Format: YYYY-MM-DD',
  })
  @ApiQuery({
    name: 'dateTo',
    type: String,
    required: false,
    description: 'Format: YYYY-MM-DD',
  })
  @ApiResponse({ status: 200, description: 'Liste des entretiens' })
  findAll(
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Query('candidateId') candidateId: string,
    @Query('status') status: InterviewStatus,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Request() req: RequestWithUser,
  ) {
    const filters: {
      candidateId?: number;
      status?: InterviewStatus;
      dateFrom?: Date;
      dateTo?: Date;
    } = {};

    if (candidateId) {
      filters.candidateId = parseInt(candidateId, 10);
    }

    if (status) {
      filters.status = status;
    }

    if (dateFrom) {
      filters.dateFrom = new Date(dateFrom);
    }

    if (dateTo) {
      filters.dateTo = new Date(dateTo);
    }

    return this.interviewsService.findAll(
      organizationId,
      req.user.id,
      Object.keys(filters).length > 0 ? filters : undefined,
    );
  }

  @Get('candidates/:candidateId')
  @ApiOperation({ summary: "Récupérer tous les entretiens d'un candidat" })
  @ApiParam({ name: 'candidateId', type: Number })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiResponse({ status: 200, description: 'Liste des entretiens du candidat' })
  getCandidateInterviews(
    @Param('candidateId', ParseIntPipe) candidateId: number,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.interviewsService.getCandidateInterviews(
      candidateId,
      organizationId,
      req.user.id,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un entretien par son ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiResponse({ status: 200, description: 'Entretien trouvé' })
  @ApiResponse({ status: 404, description: 'Entretien introuvable' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.interviewsService.findOne(id, organizationId, req.user.id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.RH, Role.MANAGER)
  @ApiOperation({ summary: 'Modifier un entretien' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiBody({ type: UpdateInterviewDto })
  @ApiResponse({ status: 200, description: 'Entretien modifié avec succès' })
  @ApiResponse({ status: 404, description: 'Entretien introuvable' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateInterviewDto: UpdateInterviewDto,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.interviewsService.update(
      id,
      updateInterviewDto,
      organizationId,
      req.user.id,
    );
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.RH, Role.MANAGER)
  @ApiOperation({ summary: 'Supprimer un entretien' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiResponse({ status: 200, description: 'Entretien supprimé avec succès' })
  @ApiResponse({ status: 404, description: 'Entretien introuvable' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.interviewsService.remove(id, organizationId, req.user.id);
  }



  @Get('calendar/info')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.RH, Role.MANAGER)
  @ApiOperation({
    summary: 'Obtenir les informations de configuration Google Calendar',
  })
  @ApiResponse({ status: 200, description: 'Informations de configuration' })
  async getCalendarInfo() {
    return this.googleCalendarService.getCalendarInfo();
  }

  @Post(':id/sync-calendar')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.RH, Role.MANAGER)
  @ApiOperation({ summary: 'Synchroniser un entretien avec Google Calendar' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiResponse({ status: 200, description: 'Synchronisation réussie' })
  @ApiResponse({ status: 400, description: 'Google Calendar non configuré' })
  async syncWithCalendar(
    @Param('id', ParseIntPipe) id: number,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.interviewsService.syncWithCalendar(
      id,
      organizationId,
      req.user.id,
    );
  }

  @Get('me/interviews')
  @UseGuards(RolesGuard)
  @Roles(Role.CANDIDATE)
  @ApiOperation({ summary: "Récupérer tous les entretiens du candidat connecté" })
  @ApiQuery({ name: 'organizationId', type: Number, required: false })
  @ApiResponse({ status: 200, description: 'Liste des entretiens' })
  getMyInterviews(
    @Query('organizationId') organizationId: string | undefined,
    @Request() req: RequestWithUser,
  ) {
    const orgId = organizationId ? parseInt(organizationId, 10) : undefined;
    return this.interviewsService.getMyInterviews(orgId, req.user.id);
  }

  @Patch('me/:id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.CANDIDATE)
  @ApiOperation({ summary: "Accepter ou refuser un entretien (Candidat)" })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'organizationId', type: Number, required: false })
  @ApiBody({ schema: { properties: { status: { type: 'string', enum: ['confirmed', 'cancelled'] } } } })
  @ApiResponse({ status: 200, description: 'Statut de l\'entretien modifié avec succès' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  updateMyInterviewStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: InterviewStatus },
    @Query('organizationId') organizationId: string | undefined,
    @Request() req: RequestWithUser,
  ) {
    const orgId = organizationId ? parseInt(organizationId, 10) : undefined;
    return this.interviewsService.updateMyInterviewStatus(
      id,
      body.status,
      orgId,
      req.user.id,
    );
  }
}
