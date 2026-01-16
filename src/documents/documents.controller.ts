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
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import type { RequestWithUser } from '../common/interfaces/user-request.interface';

@ApiTags('documents')
@ApiBearerAuth('JWT-auth')
@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.RH, Role.MANAGER, Role.CANDIDATE)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Uploader un document' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Fichier à uploader (PDF, images, etc.)',
        },
        type: {
          type: 'string',
          enum: [
            'CV',
            'DIPLOME',
            'CONTRAT',
            'ATTESTATION',
            'EVALUATION',
            'AUTRE',
          ],
          description: 'Type de document',
        },
        description: {
          type: 'string',
          description: 'Description du document',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploadé avec succès' })
  @ApiResponse({ status: 400, description: 'Aucun fichier fourni' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { type?: string; description?: string },
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    const createDocumentDto: CreateDocumentDto = {
      type: body.type as CreateDocumentDto['type'],
      description: body.description,
    };

    return this.documentsService.upload(
      file,
      createDocumentDto,
      organizationId,
      req.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: "Récupérer tous les documents d'une organisation" })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiResponse({ status: 200, description: 'Liste des documents' })
  findAll(
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.documentsService.findAll(organizationId, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un document par son ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiResponse({ status: 200, description: 'Document trouvé' })
  @ApiResponse({ status: 404, description: 'Document introuvable' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.documentsService.findOne(id, organizationId, req.user.id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Télécharger un document' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiResponse({ status: 200, description: 'Fichier téléchargé' })
  @ApiResponse({ status: 404, description: 'Document introuvable' })
  async download(
    @Param('id', ParseIntPipe) id: number,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
    @Res() res: Response,
  ) {
    const { buffer, document } = await this.documentsService.getFileBuffer(
      id,
      organizationId,
      req.user.id,
    );

    res.setHeader('Content-Type', document.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${document.originalName}"`,
    );
    res.setHeader('Content-Length', document.size);

    return res.send(buffer);
  }

  @Get(':id/url')
  @ApiOperation({ summary: 'Obtenir une URL signée pour un document' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiQuery({
    name: 'expiry',
    type: Number,
    required: false,
    description: 'Durée de validité en secondes',
  })
  @ApiResponse({ status: 200, description: 'URL signée générée' })
  async getUrl(
    @Param('id', ParseIntPipe) id: number,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Query('expiry') expiry: string,
    @Request() req: RequestWithUser,
  ) {
    const expirySeconds = expiry ? parseInt(expiry, 10) : undefined;
    const url = await this.documentsService.getFileUrl(
      id,
      organizationId,
      req.user.id,
      expirySeconds,
    );
    return { url };
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.RH, Role.MANAGER)
  @ApiOperation({ summary: 'Modifier un document' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiBody({ type: UpdateDocumentDto })
  @ApiResponse({ status: 200, description: 'Document modifié avec succès' })
  @ApiResponse({ status: 404, description: 'Document introuvable' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.documentsService.update(
      id,
      updateDocumentDto,
      organizationId,
      req.user.id,
    );
  }

  @Post(':id/process')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.RH, Role.MANAGER, Role.CANDIDATE)
  @ApiOperation({ summary: 'Traiter un document avec OCR' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiResponse({ status: 200, description: 'Document traité avec succès' })
  @ApiResponse({ status: 400, description: 'Erreur lors du traitement OCR' })
  processDocument(
    @Param('id', ParseIntPipe) id: number,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.documentsService.processDocument(
      id,
      organizationId,
      req.user.id,
    );
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.RH, Role.MANAGER)
  @ApiOperation({ summary: 'Supprimer un document' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiResponse({ status: 200, description: 'Document supprimé avec succès' })
  @ApiResponse({ status: 404, description: 'Document introuvable' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.documentsService.remove(id, organizationId, req.user.id);
  }

  @Delete('me/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.CANDIDATE)
  @ApiOperation({ summary: 'Supprimer mon propre document (candidat)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Document supprimé avec succès' })
  @ApiResponse({ status: 404, description: 'Document introuvable' })
  @ApiResponse({
    status: 403,
    description: 'Non autorisé à supprimer ce document',
  })
  removeMyDocument(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequestWithUser,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
    return this.documentsService.removeMyDocument(id, req.user.id);
  }
}
