import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormsService } from './forms.service';
import { FormsController } from './forms.controller';
import { Form } from './entities/form.entity';
import { FormField } from './entities/form-field.entity';
import { JobOffer } from './entities/job-offer.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { UserOrganization } from '../organizations/entities/user-organization.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Form,
      FormField,
      JobOffer,
      Organization,
      UserOrganization,
    ]),
  ],
  controllers: [FormsController],
  providers: [FormsService],
  exports: [FormsService],
})
export class FormsModule {}
