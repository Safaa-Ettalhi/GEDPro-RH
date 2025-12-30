import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './entities/document.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { UserOrganization } from '../organizations/entities/user-organization.entity';
import { MinioService } from './services/minio.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(UserOrganization)
    private userOrganizationRepository: Repository<UserOrganization>,
    private minioService: MinioService,
  ) {}

  private async checkOrganizationAccess(
    organizationId: number,
    userId: number,
    requiredRoles: Role[] = [Role.ADMIN, Role.MANAGER, Role.USER],
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

    return this.documentRepository.save(document);
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
}
