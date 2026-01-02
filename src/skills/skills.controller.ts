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
import { SkillsService } from './skills.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { AssociateSkillDto } from './dto/associate-skill.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import type { RequestWithUser } from '../common/interfaces/user-request.interface';

@Controller('skills')
@UseGuards(JwtAuthGuard)
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
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
  findAll(
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Query('category') category: string,
    @Request() req: RequestWithUser,
  ) {
    return this.skillsService.findAll(organizationId, req.user.id, category);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.skillsService.findOne(id, organizationId, req.user.id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
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
  @Roles(Role.ADMIN, Role.MANAGER)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.skillsService.remove(id, organizationId, req.user.id);
  }

  @Get('candidates/:candidateId')
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
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
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
  @Roles(Role.ADMIN, Role.MANAGER)
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
  @Roles(Role.ADMIN, Role.MANAGER)
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
