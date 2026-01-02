import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { FormsModule } from './forms/forms.module';
import { DocumentsModule } from './documents/documents.module';
import { CandidatesModule } from './candidates/candidates.module';
import { SkillsModule } from './skills/skills.module';
import { InterviewsModule } from './interviews/interviews.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST,
      port: Number(process.env.POSTGRES_PORT),
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      autoLoadEntities: true,
      synchronize: true,
    }),
    MongooseModule.forRoot(
      process.env.MONGO_URI || 'mongodb://localhost:27017/gedpro',
    ),
    AuthModule,
    UsersModule,
    OrganizationsModule,
    FormsModule,
    DocumentsModule,
    CandidatesModule,
    SkillsModule,
    InterviewsModule,
  ],
})
export class AppModule {}
