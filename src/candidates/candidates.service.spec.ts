import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getModelToken } from '@nestjs/mongoose';
import { CandidatesService } from './candidates.service';
import { Candidate } from './entities/candidate.entity';
import { CandidateDocument } from './entities/candidate-document.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { UserOrganization } from '../organizations/entities/user-organization.entity';
import { JobOffer } from '../forms/entities/job-offer.entity';
import { Form } from '../forms/entities/form.entity';
import { Document } from '../documents/entities/document.entity';
import { User } from '../auth/entities/user.entity';
import { CandidateStateHistory } from './schemas/candidate-state-history.schema';
import { SkillsService } from '../skills/skills.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('CandidatesService', () => {
  let service: CandidatesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidatesService,
        {
          provide: getRepositoryToken(Candidate),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              leftJoinAndSelect: jest.fn().returnThis(),
              where: jest.fn().returnThis(),
              andWhere: jest.fn().returnThis(),
              orderBy: jest.fn().returnThis(),
              getMany: jest.fn(),
              getOne: jest.fn(),
            })),
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
          provide: getRepositoryToken(JobOffer),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Form),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Document),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getModelToken(CandidateStateHistory.name),
          useValue: {
            find: jest.fn(() => ({
              sort: jest.fn(() => ({
                exec: jest.fn(),
              })),
            })),
            save: jest.fn(),
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

    service = module.get<CandidatesService>(CandidatesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
