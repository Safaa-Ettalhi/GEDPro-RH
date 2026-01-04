import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FormsService } from './forms.service';
import { Form } from './entities/form.entity';
import { FormField } from './entities/form-field.entity';
import { JobOffer } from './entities/job-offer.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { UserOrganization } from '../organizations/entities/user-organization.entity';

describe('FormsService', () => {
  let service: FormsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormsService,
        {
          provide: getRepositoryToken(Form),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(
              () =>
                ({
                  leftJoinAndSelect: jest.fn().mockReturnThis(),
                  where: jest.fn().mockReturnThis(),
                  andWhere: jest.fn().mockReturnThis(),
                  orderBy: jest.fn().mockReturnThis(),
                  addOrderBy: jest.fn().mockReturnThis(),
                  getMany: jest.fn(),
                  getOne: jest.fn(),
                }) as unknown,
            ),
          },
        },
        {
          provide: getRepositoryToken(FormField),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(
              () =>
                ({
                  where: jest.fn().mockReturnThis(),
                  select: jest.fn().mockReturnThis(),
                  getRawOne: jest.fn(),
                }) as unknown,
            ),
          },
        },
        {
          provide: getRepositoryToken(JobOffer),
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
          },
        },
      ],
    }).compile();

    service = module.get<FormsService>(FormsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
