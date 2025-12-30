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
import { FormsService } from './forms.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { CreateFormFieldDto } from './dto/create-form-field.dto';
import { CreateJobOfferDto } from './dto/create-job-offer.dto';
import { UpdateJobOfferDto } from './dto/update-job-offer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import type { RequestWithUser } from '../common/interfaces/user-request.interface';

@Controller('forms')
@UseGuards(JwtAuthGuard)
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  create(
    @Body() createFormDto: CreateFormDto,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.formsService.create(createFormDto, organizationId, req.user.id);
  }

  @Get()
  findAll(
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.formsService.findAll(organizationId, req.user.id);
  }

  @Get('job-offers')
  findAllJobOffers(
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.formsService.findAllJobOffers(organizationId, req.user.id);
  }

  @Get('job-offers/:id')
  findOneJobOffer(
    @Param('id', ParseIntPipe) id: number,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.formsService.findOneJobOffer(id, organizationId, req.user.id);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.formsService.findOne(id, organizationId, req.user.id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFormDto: UpdateFormDto,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.formsService.update(
      id,
      updateFormDto,
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
    return this.formsService.remove(id, organizationId, req.user.id);
  }

  @Post(':id/fields')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  addField(
    @Param('id', ParseIntPipe) formId: number,
    @Body() createFieldDto: CreateFormFieldDto,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.formsService.addField(
      formId,
      createFieldDto,
      organizationId,
      req.user.id,
    );
  }

  @Patch(':id/fields/:fieldId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  updateField(
    @Param('id', ParseIntPipe) formId: number,
    @Param('fieldId', ParseIntPipe) fieldId: number,
    @Body() updateFieldDto: Partial<CreateFormFieldDto>,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.formsService.updateField(
      formId,
      fieldId,
      updateFieldDto,
      organizationId,
      req.user.id,
    );
  }

  @Delete(':id/fields/:fieldId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  removeField(
    @Param('id', ParseIntPipe) formId: number,
    @Param('fieldId', ParseIntPipe) fieldId: number,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.formsService.removeField(
      formId,
      fieldId,
      organizationId,
      req.user.id,
    );
  }

  @Post('job-offers')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  createJobOffer(
    @Body() createJobOfferDto: CreateJobOfferDto,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.formsService.createJobOffer(
      createJobOfferDto,
      organizationId,
      req.user.id,
    );
  }

  @Patch('job-offers/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  updateJobOffer(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateJobOfferDto: UpdateJobOfferDto,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.formsService.updateJobOffer(
      id,
      updateJobOfferDto,
      organizationId,
      req.user.id,
    );
  }

  @Delete('job-offers/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  removeJobOffer(
    @Param('id', ParseIntPipe) id: number,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.formsService.removeJobOffer(id, organizationId, req.user.id);
  }
}
