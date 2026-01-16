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
import { JobOffer } from '../../forms/entities/job-offer.entity';
import { Form } from '../../forms/entities/form.entity';
import { User } from '../../auth/entities/user.entity';
import { CandidateState } from '../../common/enums/candidate-state.enum';

@Entity('candidates')
export class Candidate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  phone: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'organization_id' })
  organizationId: number;

  @ManyToOne(() => JobOffer, { nullable: true })
  @JoinColumn({ name: 'job_offer_id' })
  jobOffer: JobOffer;

  @Column({ name: 'job_offer_id', nullable: true })
  jobOfferId: number;

  @ManyToOne(() => Form, { nullable: true })
  @JoinColumn({ name: 'form_id' })
  form: Form;

  @Column({ name: 'form_id', nullable: true })
  formId: number;

  @Column({
    type: 'varchar',
    length: 30,
    default: CandidateState.NOUVEAU,
  })
  state: CandidateState;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'manager_id' })
  manager: User;

  @Column({ name: 'manager_id', nullable: true })
  managerId: number | null;

  @Column({ nullable: true })
  createdBy: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
