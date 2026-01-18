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
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { FormsService } from './forms.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { CreateFormFieldDto } from './dto/create-form-field.dto';
import { CreateJobOfferDto } from './dto/create-job-offer.dto';
import { UpdateJobOfferDto } from './dto/update-job-offer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import type { RequestWithUser } from '../common/interfaces/user-request.interface';

@ApiTags('forms')
@Controller('forms')
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.RH, Role.MANAGER)
  @ApiOperation({ summary: 'Créer un nouveau formulaire' })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiBody({ type: CreateFormDto })
  @ApiResponse({ status: 201, description: 'Formulaire créé avec succès' })
  create(
    @Body() createFormDto: CreateFormDto,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.formsService.create(createFormDto, organizationId, req.user.id);
  }

  @Get('job-offers/public')
  @Public()
  @ApiOperation({
    summary: "Récupérer toutes les offres d'emploi actives (public)",
  })
  @ApiResponse({
    status: 200,
    description: "Liste des offres d'emploi actives",
  })
  findPublicJobOffers() {
    return this.formsService.findPublicJobOffers();
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Récupérer tous les formulaires d'une organisation",
  })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiResponse({ status: 200, description: 'Liste des formulaires' })
  findAll(
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.formsService.findAll(organizationId, req.user.id);
  }

  @Get('job-offers')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Récupérer toutes les offres d'emploi d'une organisation",
  })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiResponse({ status: 200, description: "Liste des offres d'emploi" })
  findAllJobOffers(
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.formsService.findAllJobOffers(organizationId, req.user.id);
  }

  @Get('job-offers/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Récupérer une offre d'emploi par son ID" })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiResponse({ status: 200, description: "Offre d'emploi trouvée" })
  @ApiResponse({ status: 404, description: "Offre d'emploi introuvable" })
  findOneJobOffer(
    @Param('id', ParseIntPipe) id: number,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.formsService.findOneJobOffer(id, organizationId, req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Récupérer un formulaire par son ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiResponse({ status: 200, description: 'Formulaire trouvé' })
  @ApiResponse({ status: 404, description: 'Formulaire introuvable' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.formsService.findOne(id, organizationId, req.user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.RH, Role.MANAGER)
  @ApiOperation({ summary: 'Modifier un formulaire' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiBody({ type: UpdateFormDto })
  @ApiResponse({ status: 200, description: 'Formulaire modifié avec succès' })
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
  @Roles(Role.ADMIN, Role.RH, Role.MANAGER)
  @ApiOperation({ summary: 'Supprimer un formulaire' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiResponse({ status: 200, description: 'Formulaire supprimé avec succès' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.formsService.remove(id, organizationId, req.user.id);
  }

  @Post(':id/fields')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.RH, Role.MANAGER)
  @ApiOperation({ summary: 'Ajouter un champ à un formulaire' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiBody({ type: CreateFormFieldDto })
  @ApiResponse({ status: 201, description: 'Champ ajouté avec succès' })
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.RH, Role.MANAGER)
  @ApiOperation({ summary: "Modifier un champ d'un formulaire" })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'fieldId', type: Number })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiBody({ type: CreateFormFieldDto })
  @ApiResponse({ status: 200, description: 'Champ modifié avec succès' })
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
  @Roles(Role.ADMIN, Role.RH, Role.MANAGER)
  @ApiOperation({ summary: "Supprimer un champ d'un formulaire" })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'fieldId', type: Number })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiResponse({ status: 200, description: 'Champ supprimé avec succès' })
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.RH)
  @ApiOperation({ summary: "Créer une nouvelle offre d'emploi" })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiBody({ type: CreateJobOfferDto })
  @ApiResponse({ status: 201, description: "Offre d'emploi créée avec succès" })
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
  @Roles(Role.ADMIN, Role.RH)
  @ApiOperation({ summary: "Modifier une offre d'emploi" })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiBody({ type: UpdateJobOfferDto })
  @ApiResponse({
    status: 200,
    description: "Offre d'emploi modifiée avec succès",
  })
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.RH)
  @ApiOperation({ summary: "Supprimer une offre d'emploi" })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiResponse({
    status: 200,
    description: "Offre d'emploi supprimée avec succès",
  })
  removeJobOffer(
    @Param('id', ParseIntPipe) id: number,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.formsService.removeJobOffer(id, organizationId, req.user.id);
  }
}
