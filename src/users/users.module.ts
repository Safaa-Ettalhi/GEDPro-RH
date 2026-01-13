import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from '../auth/entities/user.entity';
import { UserOrganization } from '../organizations/entities/user-organization.entity';
import { Organization } from '../organizations/entities/organization.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserOrganization, Organization])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
