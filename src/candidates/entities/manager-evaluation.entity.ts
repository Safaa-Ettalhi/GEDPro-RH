import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Candidate } from './candidate.entity';
import { User } from '../../auth/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { Interview } from '../../interviews/entities/interview.entity';
import { EvaluationRecommendation } from '../../common/enums/evaluation-recommendation.enum';

@Entity('manager_evaluations')
export class ManagerEvaluation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Candidate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidate_id' })
  candidate: Candidate;

  @Column({ name: 'candidate_id' })
  candidateId: number;

  @ManyToOne(() => Interview, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'interview_id' })
  interview: Interview;

  @Column({ name: 'interview_id', nullable: true })
  interviewId: number | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'manager_id' })
  manager: User;

  @Column({ name: 'manager_id' })
  managerId: number;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'organization_id' })
  organizationId: number;

  @Column({
    type: 'varchar',
    length: 30,
  })
  recommendation: EvaluationRecommendation;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
