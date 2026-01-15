import {
  Entity,
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  OneToMany,
} from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { UserOrganization } from '../../organizations/entities/user-organization.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: Role.CANDIDATE,
  })
  role: Role;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => UserOrganization, (userOrg) => userOrg.user)
  userOrganizations: UserOrganization[];
}
