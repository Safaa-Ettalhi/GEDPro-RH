import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InterviewsService } from './interviews.service';
import { Interview } from './entities/interview.entity';
import { Candidate } from '../candidates/entities/candidate.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { UserOrganization } from '../organizations/entities/user-organization.entity';
import { User } from '../auth/entities/user.entity';
import { GoogleCalendarService } from './services/google-calendar.service';
import { CandidatesService } from '../candidates/candidates.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('InterviewsService', () => {
  let service: InterviewsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterviewsService,
        {
          provide: getRepositoryToken(Interview),
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
              addOrderBy: jest.fn().returnThis(),
              getMany: jest.fn(),
              getOne: jest.fn(),
            })),
          },
        },
        {
          provide: getRepositoryToken(Candidate),
          useValue: {
            findOne: jest.fn(),
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
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: GoogleCalendarService,
          useValue: {
            isConfigured: jest.fn().mockReturnValue(false),
            createEvent: jest.fn(),
            updateEvent: jest.fn(),
            deleteEvent: jest.fn(),
          },
        },
        {
          provide: CandidatesService,
          useValue: {
            changeState: jest.fn(),
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

    service = module.get<InterviewsService>(InterviewsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
