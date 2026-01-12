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
import { CandidatesService } from './candidates.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { ChangeStateDto } from './dto/change-state.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CandidateState } from '../common/enums/candidate-state.enum';
import type { RequestWithUser } from '../common/interfaces/user-request.interface';

@ApiTags('candidates')
@ApiBearerAuth('JWT-auth')
@Controller('candidates')
@UseGuards(JwtAuthGuard)
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.RH, Role.MANAGER, Role.CANDIDATE)
  @ApiOperation({ summary: 'Créer un nouveau candidat' })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiResponse({ status: 201, description: 'Candidat créé avec succès' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiBody({ type: CreateCandidateDto })
  create(
    @Body() createCandidateDto: CreateCandidateDto,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.candidatesService.create(
      createCandidateDto,
      organizationId,
      req.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: "Récupérer tous les candidats d'une organisation" })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiQuery({ name: 'state', enum: CandidateState, required: false })
  @ApiQuery({ name: 'jobOfferId', type: Number, required: false })
  @ApiQuery({ name: 'formId', type: Number, required: false })
  @ApiResponse({ status: 200, description: 'Liste des candidats' })
  findAll(
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Query('state') state: CandidateState,
    @Query('jobOfferId') jobOfferId: string,
    @Query('formId') formId: string,
    @Request() req: RequestWithUser,
  ) {
    const filters: {
      state?: CandidateState;
      jobOfferId?: number;
      formId?: number;
    } = {};

    if (state) {
      filters.state = state;
    }

    if (jobOfferId) {
      filters.jobOfferId = parseInt(jobOfferId, 10);
    }

    if (formId) {
      filters.formId = parseInt(formId, 10);
    }

    return this.candidatesService.findAll(
      organizationId,
      req.user.id,
      Object.keys(filters).length > 0 ? filters : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un candidat par son ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiResponse({ status: 200, description: 'Candidat trouvé' })
  @ApiResponse({ status: 404, description: 'Candidat introuvable' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.candidatesService.findOne(id, organizationId, req.user.id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.RH, Role.MANAGER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCandidateDto: UpdateCandidateDto,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.candidatesService.update(
      id,
      updateCandidateDto,
      organizationId,
      req.user.id,
    );
  }

  @Patch(':id/state')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.RH, Role.MANAGER)
  @ApiOperation({ summary: "Changer l'état d'un candidat" })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiResponse({ status: 200, description: 'État modifié avec succès' })
  @ApiResponse({ status: 400, description: 'État invalide' })
  @ApiBody({ type: ChangeStateDto })
  changeState(
    @Param('id', ParseIntPipe) id: number,
    @Body() changeStateDto: ChangeStateDto,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.candidatesService.changeState(
      id,
      changeStateDto,
      organizationId,
      req.user.id,
    );
  }

  @Get(':id/history')
  getStateHistory(
    @Param('id', ParseIntPipe) id: number,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.candidatesService.getStateHistory(
      id,
      organizationId,
      req.user.id,
    );
  }

  @Get(':id/documents')
  getCandidateDocuments(
    @Param('id', ParseIntPipe) id: number,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.candidatesService.getCandidateDocuments(
      id,
      organizationId,
      req.user.id,
    );
  }

  @Post(':id/documents/:documentId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.RH, Role.MANAGER, Role.CANDIDATE)
  associateDocument(
    @Param('id', ParseIntPipe) candidateId: number,
    @Param('documentId', ParseIntPipe) documentId: number,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.candidatesService.associateDocument(
      candidateId,
      documentId,
      organizationId,
      req.user.id,
    );
  }

  @Delete(':id/documents/:documentId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.RH, Role.MANAGER)
  removeDocument(
    @Param('id', ParseIntPipe) candidateId: number,
    @Param('documentId', ParseIntPipe) documentId: number,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.candidatesService.removeDocument(
      candidateId,
      documentId,
      organizationId,
      req.user.id,
    );
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.RH, Role.MANAGER)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.candidatesService.remove(id, organizationId, req.user.id);
  }
}
