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
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { AssignUserDto } from './dto/assign-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../common/interfaces/user-request.interface';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  create(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @Request() req: RequestWithUser,
  ) {
    return this.organizationsService.create(createOrganizationDto, req.user.id);
  }

  @Get()
  findAll(@Request() req: RequestWithUser) {
    return this.organizationsService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequestWithUser,
  ) {
    return this.organizationsService.findOne(id, req.user.id);
  }

  @Patch(':id')
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
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequestWithUser,
  ) {
    return this.organizationsService.remove(id, req.user.id);
  }

  @Post(':id/users')
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
