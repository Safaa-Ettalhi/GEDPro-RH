import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { Candidate } from '../../candidates/entities/candidate.entity';
import { User } from '../../auth/entities/user.entity';
import { InterviewType } from '../../common/enums/interview-type.enum';
import { InterviewStatus } from '../../common/enums/interview-status.enum';

@Entity('interviews')
export class Interview {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Candidate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidate_id' })
  candidate: Candidate;

  @Column({ name: 'candidate_id' })
  candidateId: number;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'organization_id' })
  organizationId: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'time' })
  startTime: string;

  @Column({ type: 'int' })
  duration: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: InterviewType.TECHNIQUE,
  })
  type: InterviewType;

  @Column({
    type: 'varchar',
    length: 20,
    default: InterviewStatus.PLANNED,
  })
  status: InterviewStatus;

  @Column({ type: 'text', nullable: true })
  location: string;

  @Column({ type: 'text', nullable: true })
  meetingLink: string;

  @Column({ type: 'text', nullable: true })
  calendarEventId: string;

  @Column('simple-array', { nullable: true })
  participantIds: number[];

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdByUser: User;

  @Column({ name: 'created_by' })
  createdBy: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
