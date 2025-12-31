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

@Controller('candidates')
@UseGuards(JwtAuthGuard)
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
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
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.candidatesService.findOne(id, organizationId, req.user.id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
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
  @Roles(Role.ADMIN, Role.MANAGER)
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
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
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
  @Roles(Role.ADMIN, Role.MANAGER)
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
  @Roles(Role.ADMIN, Role.MANAGER)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.candidatesService.remove(id, organizationId, req.user.id);
  }
}
