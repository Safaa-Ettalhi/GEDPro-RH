import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Form } from './entities/form.entity';
import { FormField } from './entities/form-field.entity';
import { JobOffer } from './entities/job-offer.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { UserOrganization } from '../organizations/entities/user-organization.entity';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { CreateFormFieldDto } from './dto/create-form-field.dto';
import { CreateJobOfferDto } from './dto/create-job-offer.dto';
import { UpdateJobOfferDto } from './dto/update-job-offer.dto';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class FormsService {
  constructor(
    @InjectRepository(Form)
    private formRepository: Repository<Form>,
    @InjectRepository(FormField)
    private formFieldRepository: Repository<FormField>,
    @InjectRepository(JobOffer)
    private jobOfferRepository: Repository<JobOffer>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(UserOrganization)
    private userOrganizationRepository: Repository<UserOrganization>,
  ) {}

  private async checkOrganizationAccess(
    organizationId: number,
    userId: number,
    requiredRoles: Role[] = [Role.ADMIN, Role.RH, Role.MANAGER],
  ): Promise<UserOrganization> {
    const userOrg = await this.userOrganizationRepository.findOne({
      where: { organizationId, userId },
    });

    if (!userOrg) {
      throw new ForbiddenException(
        "Vous n'appartenez pas à cette organisation",
      );
    }

    const userRole = String(userOrg.role).trim().toLowerCase();
    const hasPermission = requiredRoles.some(
      (role) => String(role).trim().toLowerCase() === userRole,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Vous devez avoir le rôle ${requiredRoles.join(' ou ')} pour effectuer cette action`,
      );
    }

    return userOrg;
  }

  async create(
    createFormDto: CreateFormDto,
    organizationId: number,
    userId: number,
  ): Promise<Form> {
    await this.checkOrganizationAccess(organizationId, userId);

    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organisation introuvable');
    }
    const form = this.formRepository.create({
      name: createFormDto.name,
      description: createFormDto.description,
      type: createFormDto.type,
      organizationId,
      isActive: createFormDto.isActive ?? true,
    });

    if (createFormDto.fields && createFormDto.fields.length > 0) {
      form.fields = createFormDto.fields.map((fieldDto, index) =>
        this.formFieldRepository.create({
          ...fieldDto,
          order: fieldDto.order ?? index,
        }),
      );
    }

    const savedForm = await this.formRepository.save(form);
    return this.findOne(savedForm.id, organizationId, userId);
  }

  // all formulaire dorganisation
  async findAll(organizationId: number, userId: number): Promise<Form[]> {
    await this.checkOrganizationAccess(organizationId, userId, [
      Role.ADMIN,
      Role.MANAGER,
      Role.CANDIDATE,
    ]);

    return this.formRepository
      .createQueryBuilder('form')
      .leftJoinAndSelect('form.fields', 'field')
      .where('form.organizationId = :organizationId', { organizationId })
      .orderBy('form.createdAt', 'DESC')
      .addOrderBy('field.order', 'ASC')
      .getMany();
  }

  async findOne(
    id: number,
    organizationId: number,
    userId: number,
  ): Promise<Form> {
    await this.checkOrganizationAccess(organizationId, userId, [
      Role.ADMIN,
      Role.MANAGER,
      Role.CANDIDATE,
    ]);

    const form = await this.formRepository
      .createQueryBuilder('form')
      .leftJoinAndSelect('form.fields', 'field')
      .where('form.id = :id', { id })
      .andWhere('form.organizationId = :organizationId', { organizationId })
      .orderBy('field.order', 'ASC')
      .getOne();

    if (!form) {
      throw new NotFoundException('Formulaire introuvable');
    }

    return form;
  }

  async update(
    id: number,
    updateFormDto: UpdateFormDto,
    organizationId: number,
    userId: number,
  ): Promise<Form> {
    await this.checkOrganizationAccess(organizationId, userId);

    const form = await this.formRepository.findOne({
      where: { id, organizationId },
    });

    if (!form) {
      throw new NotFoundException('Formulaire introuvable');
    }

    Object.assign(form, updateFormDto);
    await this.formRepository.save(form);

    return this.findOne(id, organizationId, userId);
  }

  async remove(
    id: number,
    organizationId: number,
    userId: number,
  ): Promise<{ message: string }> {
    await this.checkOrganizationAccess(organizationId, userId);

    const form = await this.formRepository.findOne({
      where: { id, organizationId },
    });

    if (!form) {
      throw new NotFoundException('Formulaire introuvable');
    }

    await this.formRepository.remove(form);
    return { message: 'Formulaire supprimé avec succès' };
  }

  async addField(
    formId: number,
    createFieldDto: CreateFormFieldDto,
    organizationId: number,
    userId: number,
  ): Promise<FormField> {
    await this.checkOrganizationAccess(organizationId, userId);

    const form = await this.formRepository.findOne({
      where: { id: formId, organizationId },
    });

    if (!form) {
      throw new NotFoundException('Formulaire introuvable');
    }

    let order = createFieldDto.order;
    if (order === undefined) {
      const maxOrder = await this.formFieldRepository
        .createQueryBuilder('field')
        .where('field.formId = :formId', { formId })
        .select('MAX(field.order)', 'max')
        .getRawOne<{ max: number | null }>();
      const maxValue = maxOrder?.max ?? null;
      order = maxValue !== null ? maxValue + 1 : 0;
    }

    const field = this.formFieldRepository.create({
      ...createFieldDto,
      formId,
      order,
    });

    return this.formFieldRepository.save(field);
  }

  async updateField(
    formId: number,
    fieldId: number,
    updateFieldDto: Partial<CreateFormFieldDto>,
    organizationId: number,
    userId: number,
  ): Promise<FormField> {
    await this.checkOrganizationAccess(organizationId, userId);

    const form = await this.formRepository.findOne({
      where: { id: formId, organizationId },
    });

    if (!form) {
      throw new NotFoundException('Formulaire introuvable');
    }

    const field = await this.formFieldRepository.findOne({
      where: { id: fieldId, formId },
    });

    if (!field) {
      throw new NotFoundException('Champ introuvable');
    }

    Object.assign(field, updateFieldDto);
    return this.formFieldRepository.save(field);
  }

  async removeField(
    formId: number,
    fieldId: number,
    organizationId: number,
    userId: number,
  ): Promise<{ message: string }> {
    await this.checkOrganizationAccess(organizationId, userId);

    const form = await this.formRepository.findOne({
      where: { id: formId, organizationId },
    });

    if (!form) {
      throw new NotFoundException('Formulaire introuvable');
    }

    const field = await this.formFieldRepository.findOne({
      where: { id: fieldId, formId },
    });

    if (!field) {
      throw new NotFoundException('Champ introuvable');
    }

    await this.formFieldRepository.remove(field);
    return { message: 'Champ supprimé avec succès' };
  }

  async createJobOffer(
    createJobOfferDto: CreateJobOfferDto,
    organizationId: number,
    userId: number,
  ): Promise<JobOffer> {
    await this.checkOrganizationAccess(organizationId, userId);

    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organisation introuvable');
    }

    if (createJobOfferDto.formId) {
      const form = await this.formRepository.findOne({
        where: { id: createJobOfferDto.formId, organizationId },
      });

      if (!form) {
        throw new NotFoundException(
          "Formulaire introuvable ou n'appartient pas à cette organisation",
        );
      }
    }

    const jobOffer = this.jobOfferRepository.create({
      ...createJobOfferDto,
      organizationId,
      isActive: createJobOfferDto.isActive ?? true,
    });

    return this.jobOfferRepository.save(jobOffer);
  }

  async findAllJobOffers(
    organizationId: number,
    userId: number,
  ): Promise<JobOffer[]> {
    await this.checkOrganizationAccess(organizationId, userId, [
      Role.ADMIN,
      Role.MANAGER,
      Role.CANDIDATE,
    ]);

    return this.jobOfferRepository.find({
      where: { organizationId },
      relations: ['form', 'form.fields'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOneJobOffer(
    id: number,
    organizationId: number,
    userId: number,
  ): Promise<JobOffer> {
    await this.checkOrganizationAccess(organizationId, userId, [
      Role.ADMIN,
      Role.MANAGER,
      Role.CANDIDATE,
    ]);

    const jobOffer = await this.jobOfferRepository.findOne({
      where: { id, organizationId },
      relations: ['form', 'form.fields'],
    });

    if (!jobOffer) {
      throw new NotFoundException("Offre d'emploi introuvable");
    }

    return jobOffer;
  }

  async updateJobOffer(
    id: number,
    updateJobOfferDto: UpdateJobOfferDto,
    organizationId: number,
    userId: number,
  ): Promise<JobOffer> {
    await this.checkOrganizationAccess(organizationId, userId);

    const jobOffer = await this.jobOfferRepository.findOne({
      where: { id, organizationId },
    });

    if (!jobOffer) {
      throw new NotFoundException("Offre d'emploi introuvable");
    }

    if (updateJobOfferDto.formId !== undefined) {
      if (updateJobOfferDto.formId !== null) {
        const form = await this.formRepository.findOne({
          where: { id: updateJobOfferDto.formId, organizationId },
        });

        if (!form) {
          throw new NotFoundException(
            "Formulaire introuvable ou n'appartient pas à cette organisation",
          );
        }
      }
    }

    Object.assign(jobOffer, updateJobOfferDto);
    await this.jobOfferRepository.save(jobOffer);

    return this.findOneJobOffer(id, organizationId, userId);
  }

  async removeJobOffer(
    id: number,
    organizationId: number,
    userId: number,
  ): Promise<{ message: string }> {
    await this.checkOrganizationAccess(organizationId, userId);

    const jobOffer = await this.jobOfferRepository.findOne({
      where: { id, organizationId },
    });

    if (!jobOffer) {
      throw new NotFoundException("Offre d'emploi introuvable");
    }

    await this.jobOfferRepository.remove(jobOffer);
    return { message: "Offre d'emploi supprimée avec succès" };
  }
}
