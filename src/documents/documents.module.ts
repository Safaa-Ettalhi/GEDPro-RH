import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { Document } from './entities/document.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { UserOrganization } from '../organizations/entities/user-organization.entity';
import { MinioService } from './services/minio.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, Organization, UserOrganization]),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, MinioService],
  exports: [DocumentsService, MinioService],
})
export class DocumentsModule {}
