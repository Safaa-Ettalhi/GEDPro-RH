import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { CandidatesService } from './candidates.service';
import { CandidatesController } from './candidates.controller';
import { Candidate } from './entities/candidate.entity';
import { CandidateDocument } from './entities/candidate-document.entity';
import { ManagerEvaluation } from './entities/manager-evaluation.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { UserOrganization } from '../organizations/entities/user-organization.entity';
import { JobOffer } from '../forms/entities/job-offer.entity';
import { Form } from '../forms/entities/form.entity';
import { Document } from '../documents/entities/document.entity';
import { User } from '../auth/entities/user.entity';
import { Interview } from '../interviews/entities/interview.entity';
import {
  CandidateStateHistory,
  CandidateStateHistorySchema,
} from './schemas/candidate-state-history.schema';
import { SkillsModule } from '../skills/skills.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Candidate,
      CandidateDocument,
      ManagerEvaluation,
      Organization,
      UserOrganization,
      JobOffer,
      Form,
      Document,
      User,
      Interview,
    ]),
    MongooseModule.forFeature([
      { name: CandidateStateHistory.name, schema: CandidateStateHistorySchema },
    ]),
    SkillsModule,
    NotificationsModule,
  ],
  controllers: [CandidatesController],
  providers: [CandidatesService],
  exports: [CandidatesService],
})
export class CandidatesModule {}
