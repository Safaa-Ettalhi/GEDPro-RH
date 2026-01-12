import {
  Entity,
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Organization } from './organization.entity';
import { Role } from '../../common/enums/role.enum';

@Entity('user_organizations')
@Unique(['user', 'organization'])
export class UserOrganization {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'organization_id' })
  organizationId: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: Role.CANDIDATE,
  })
  role: Role;

  @CreateDateColumn()
  joinedAt: Date;
}
