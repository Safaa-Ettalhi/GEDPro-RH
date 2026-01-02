import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SkillsService } from './skills.service';
import { SkillsController } from './skills.controller';
import { Skill } from './entities/skill.entity';
import { CandidateSkill } from './entities/candidate-skill.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { UserOrganization } from '../organizations/entities/user-organization.entity';
import { Candidate } from '../candidates/entities/candidate.entity';
import { OcrService } from './services/ocr.service';
import { SkillsExtractionService } from './services/skills-extraction.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Skill,
      CandidateSkill,
      Organization,
      UserOrganization,
      Candidate,
    ]),
    NotificationsModule,
  ],
  controllers: [SkillsController],
  providers: [SkillsService, OcrService, SkillsExtractionService],
  exports: [SkillsService, OcrService, SkillsExtractionService],
})
export class SkillsModule {}
