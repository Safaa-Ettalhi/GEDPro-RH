import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Document } from './entities/document.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { UserOrganization } from '../organizations/entities/user-organization.entity';
import { MinioService } from './services/minio.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { Role } from '../common/enums/role.enum';
import { OcrService } from '../skills/services/ocr.service';
import { SkillsService } from '../skills/skills.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../common/enums/notification-type.enum';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(UserOrganization)
    private userOrganizationRepository: Repository<UserOrganization>,
    private minioService: MinioService,
    private ocrService: OcrService,
    private skillsService: SkillsService,
    private notificationsService: NotificationsService,
  ) {}

  private async checkOrganizationAccess(
    organizationId: number,
    userId: number,
    requiredRoles: Role[] = [Role.ADMIN, Role.RH, Role.MANAGER, Role.CANDIDATE],
  ): Promise<UserOrganization> {
    const userOrg = await this.userOrganizationRepository.findOne({
      where: { organizationId, userId },
    });

    if (!userOrg) {
      throw new ForbiddenException(
        "Vous n'appartenez pas à cette organisation",
      );
    }

    const userRole = String(userOrg.role).trim().toLowerCase();
    const hasPermission = requiredRoles.some(
      (role) => String(role).trim().toLowerCase() === userRole,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Vous devez avoir le rôle ${requiredRoles.join(' ou ')} pour effectuer cette action`,
      );
    }

    return userOrg;
  }

  async upload(
    file: Express.Multer.File,
    createDocumentDto: CreateDocumentDto,
    organizationId: number,
    userId: number,
  ): Promise<Document> {
    await this.checkOrganizationAccess(organizationId, userId);

    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organisation introuvable');
    }

    const { path, filename } = await this.minioService.uploadFile(
      file,
      organizationId,
      createDocumentDto.type,
    );

    const document = this.documentRepository.create({
      filename: filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      type: createDocumentDto.type,
      minioPath: path,
      bucketName: this.minioService.getBucketName(),
      organizationId,
      uploadedBy: userId,
      description: createDocumentDto.description,
      isProcessed: false,
    });

    const savedDocument = await this.documentRepository.save(document);

    // Notifier les ADMIN et MANAGER de l'upload
    try {
      const rhUsers = await this.userOrganizationRepository.find({
        where: {
          organizationId,
          role: In([Role.ADMIN, Role.RH, Role.MANAGER]),
        },
        relations: ['user'],
      });

      const userIds = rhUsers
        .map((uo) => uo.user?.id)
        .filter((id): id is number => id !== undefined && id !== userId);

      if (userIds.length > 0) {
        await this.notificationsService.createAndSend(
          NotificationType.DOCUMENT_UPLOADED,
          'Nouveau document uploadé',
          `Document "${savedDocument.originalName}" (${savedDocument.type}) a été uploadé`,
          organizationId,
          userIds,
          {
            documentId: savedDocument.id,
            documentType: savedDocument.type,
          },
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.warn(
        `Erreur lors de l'envoi de la notification d'upload: ${errorMessage}`,
      );
    }

    this.processDocumentAsync(
      savedDocument.id,
      file.buffer,
      file.mimetype,
    ).catch((error) => {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(
        `Erreur lors du traitement OCR du document ${savedDocument.id}: ${errorMessage}`,
      );
    });

    return savedDocument;
  }

  async findAll(organizationId: number, userId: number): Promise<Document[]> {
    await this.checkOrganizationAccess(organizationId, userId);

    return this.documentRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(
    id: number,
    organizationId: number,
    userId: number,
  ): Promise<Document> {
    await this.checkOrganizationAccess(organizationId, userId);

    const document = await this.documentRepository.findOne({
      where: { id, organizationId },
    });

    if (!document) {
      throw new NotFoundException('Document introuvable');
    }

    return document;
  }

  async getFileBuffer(
    id: number,
    organizationId: number,
    userId: number,
  ): Promise<{ buffer: Buffer; document: Document }> {
    const document = await this.findOne(id, organizationId, userId);
    const buffer = await this.minioService.getFile(document.minioPath);

    return { buffer, document };
  }

  async getFileUrl(
    id: number,
    organizationId: number,
    userId: number,
    expiry?: number,
  ): Promise<string> {
    const document = await this.findOne(id, organizationId, userId);
    return this.minioService.getFileUrl(document.minioPath, expiry);
  }

  async update(
    id: number,
    updateDocumentDto: UpdateDocumentDto,
    organizationId: number,
    userId: number,
  ): Promise<Document> {
    await this.checkOrganizationAccess(organizationId, userId);

    const document = await this.documentRepository.findOne({
      where: { id, organizationId },
    });

    if (!document) {
      throw new NotFoundException('Document introuvable');
    }

    Object.assign(document, updateDocumentDto);
    return this.documentRepository.save(document);
  }

  async remove(
    id: number,
    organizationId: number,
    userId: number,
  ): Promise<{ message: string }> {
    await this.checkOrganizationAccess(organizationId, userId);

    const document = await this.documentRepository.findOne({
      where: { id, organizationId },
    });

    if (!document) {
      throw new NotFoundException('Document introuvable');
    }

    await this.minioService.deleteFile(document.minioPath);
    await this.documentRepository.remove(document);

    return { message: 'Document supprimé avec succès' };
  }

  private async processDocumentAsync(
    documentId: number,
    buffer: Buffer,
    mimeType: string,
  ): Promise<void> {
    try {
      this.logger.log(`Début du traitement OCR pour le document ${documentId}`);

      const extractedText = await this.ocrService.extractText(buffer, mimeType);

      if (!extractedText || extractedText.trim().length === 0) {
        this.logger.warn(`Aucun texte extrait du document ${documentId}`);
        return;
      }

      const document = await this.documentRepository.findOne({
        where: { id: documentId },
      });

      if (!document) {
        this.logger.warn(
          `Document ${documentId} introuvable pour traitement OCR`,
        );
        return;
      }

      document.extractedText = extractedText;
      document.isProcessed = true;
      await this.documentRepository.save(document);

      this.logger.log(
        `Texte extrait du document ${documentId} (${extractedText.length} caractères)`,
      );

      // Notifier l'utilisateur qui a uploadé le document que le traitement est terminé
      try {
        if (document.uploadedBy && document.organizationId) {
          await this.notificationsService.createAndSend(
            NotificationType.DOCUMENT_PROCESSED,
            'Traitement OCR terminé',
            `Le document "${document.originalName}" a été traité avec succès. ${extractedText.length} caractères extraits.`,
            document.organizationId,
            [document.uploadedBy],
            {
              documentId: document.id,
              extractedTextLength: extractedText.length,
            },
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Erreur inconnue';
        this.logger.warn(
          `Erreur lors de l'envoi de la notification de traitement OCR: ${errorMessage}`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(
        `Erreur lors du traitement OCR du document ${documentId}: ${errorMessage}`,
      );

      const document = await this.documentRepository.findOne({
        where: { id: documentId },
      });
      if (document) {
        document.isProcessed = false;
        await this.documentRepository.save(document);
      }
    }
  }

  async processDocument(
    id: number,
    organizationId: number,
    userId: number,
  ): Promise<{ message: string; extractedText: string }> {
    await this.checkOrganizationAccess(organizationId, userId);

    const document = await this.findOne(id, organizationId, userId);

    try {
      this.logger.log(
        `Traitement OCR manuel pour le document ${id} (${document.minioPath})`,
      );
      const buffer = await this.minioService.getFile(document.minioPath);

      if (!buffer || buffer.length === 0) {
        throw new Error('Le fichier est vide ou introuvable dans MinIO');
      }

      this.logger.log(
        `Fichier récupéré depuis MinIO (${buffer.length} bytes), début extraction OCR...`,
      );

      const extractedText = await this.ocrService.extractText(
        buffer,
        document.mimeType,
      );

      if (!extractedText || extractedText.trim().length === 0) {
        this.logger.warn(`Aucun texte extrait du document ${id}`);
        document.isProcessed = true;
        document.extractedText = '';
        await this.documentRepository.save(document);

        return {
          message: 'Document traité mais aucun texte extrait',
          extractedText: '',
        };
      }

      document.extractedText = extractedText;
      document.isProcessed = true;
      await this.documentRepository.save(document);

      this.logger.log(
        `Texte extrait avec succès (${extractedText.length} caractères)`,
      );

      return {
        message: 'Document traité avec succès',
        extractedText,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(
        `Erreur lors du traitement OCR du document ${id}: ${errorMessage}`,
      );
      this.logger.error(error instanceof Error ? error.stack : '');

      document.isProcessed = false;
      await this.documentRepository.save(document);

      throw new BadRequestException(
        `Erreur lors du traitement OCR: ${errorMessage}`,
      );
    }
  }
}
