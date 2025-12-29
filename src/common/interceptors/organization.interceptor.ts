import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { OrganizationsService } from '../../organizations/organizations.service';
import { UserPayload } from '../interfaces/user-request.interface';

interface RequestWithOrganization {
  user?: UserPayload;
  query?: {
    organizationId?: string | string[];
    [key: string]: string | string[] | undefined;
  };
  headers: {
    'x-organization-id'?: string | string[];
    [key: string]: string | string[] | undefined;
  };
  body?: {
    organizationId?: string | number;
    [key: string]: unknown;
  };
  organizationId?: number;
}

@Injectable()
export class OrganizationInterceptor implements NestInterceptor {
  constructor(private organizationsService: OrganizationsService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithOrganization>();
    const user = request.user;

    if (!user) {
      return next.handle();
    }

    const organizationIdRaw =
      request.query?.organizationId ||
      request.headers['x-organization-id'] ||
      request.body?.organizationId;

    if (organizationIdRaw) {
      try {
        const organizationId = Array.isArray(organizationIdRaw)
          ? Number(organizationIdRaw[0])
          : Number(organizationIdRaw);

        if (isNaN(organizationId)) {
          throw new BadRequestException("ID d'organisation invalide");
        }

        await this.organizationsService.findOne(organizationId, user.id);
        request.organizationId = organizationId;
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new BadRequestException(
          'Organisation introuvable ou accès non autorisé',
        );
      }
    } else {
      const org = await this.organizationsService.getCurrentUserOrganization(
        user.id,
      );
      if (org) {
        request.organizationId = org.id;
      }
    }

    return next.handle();
  }
}
