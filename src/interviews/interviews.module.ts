import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterviewsService } from './interviews.service';
import { InterviewsController } from './interviews.controller';
import { Interview } from './entities/interview.entity';
import { Candidate } from '../candidates/entities/candidate.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { UserOrganization } from '../organizations/entities/user-organization.entity';
import { User } from '../auth/entities/user.entity';
import { CandidatesModule } from '../candidates/candidates.module';
import { GoogleCalendarService } from './services/google-calendar.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Interview,
      Candidate,
      Organization,
      UserOrganization,
      User,
    ]),
    CandidatesModule,
    NotificationsModule,
  ],
  controllers: [InterviewsController],
  providers: [InterviewsService, GoogleCalendarService],
  exports: [InterviewsService],
})
export class InterviewsModule {}
