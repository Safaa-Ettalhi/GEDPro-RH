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

@Controller('interviews')
@UseGuards(JwtAuthGuard)
export class InterviewsController {
  constructor(
    private readonly interviewsService: InterviewsService,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
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
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.interviewsService.findOne(id, organizationId, req.user.id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
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
  @Roles(Role.ADMIN, Role.MANAGER)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.interviewsService.remove(id, organizationId, req.user.id);
  }

  @Get('calendar/auth-url')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  getCalendarAuthUrl() {
    try {
      const authUrl = this.googleCalendarService.getAuthUrl();
      return { authUrl };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      return {
        error: 'Google Calendar non configuré',
        message: errorMessage,
      };
    }
  }

  @Get('calendar/info')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  async getCalendarInfo() {
    return this.googleCalendarService.getCalendarInfo();
  }

  @Post(':id/sync-calendar')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
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
}
