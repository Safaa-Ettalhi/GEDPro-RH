import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { FormField } from './form-field.entity';
import { FormType } from '../../common/enums/form-type.enum';
import { JobOffer } from './job-offer.entity';

@Entity('forms')
export class Form {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'varchar',
    length: 20,
  })
  type: FormType;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'organization_id' })
  organizationId: number;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => FormField, (field) => field.form, { cascade: true })
  fields: FormField[];

  @OneToMany(() => JobOffer, (jobOffer) => jobOffer.form)
  jobOffers: JobOffer[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
