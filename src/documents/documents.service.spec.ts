import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DocumentsService } from './documents.service';
import { Document } from './entities/document.entity';
import { CandidateDocument } from '../candidates/entities/candidate-document.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { UserOrganization } from '../organizations/entities/user-organization.entity';
import { MinioService } from './services/minio.service';
import { OcrService } from '../skills/services/ocr.service';
import { SkillsService } from '../skills/skills.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('DocumentsService', () => {
  let service: DocumentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: getRepositoryToken(Document),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Organization),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserOrganization),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(CandidateDocument),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: MinioService,
          useValue: {
            uploadFile: jest.fn(),
            getFile: jest.fn(),
            getFileUrl: jest.fn(),
            deleteFile: jest.fn(),
            getBucketName: jest.fn().mockReturnValue('gedpro-documents'),
          },
        },
        {
          provide: OcrService,
          useValue: {
            extractText: jest.fn(),
          },
        },
        {
          provide: SkillsService,
          useValue: {
            extractAndAssociateSkills: jest.fn(),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            createAndSend: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
