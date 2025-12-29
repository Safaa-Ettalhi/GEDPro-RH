import { createParamDecorator, ExecutionContext } from '@nestjs/common';

interface RequestWithOrganization {
  query?: {
    organizationId?: string | string[];
    [key: string]: string | string[] | undefined;
  };
  headers: {
    'x-organization-id'?: string | string[];
    [key: string]: string | string[] | undefined;
  };
  organizationId?: number;
}

export const CurrentOrganization = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): number | null => {
    const request = ctx.switchToHttp().getRequest<RequestWithOrganization>();
    // Récupérer depuis query param ou header
    const organizationId =
      request.query?.organizationId ||
      request.headers['x-organization-id'] ||
      request.organizationId;

    if (organizationId) {
      const idStr = Array.isArray(organizationId)
        ? organizationId[0]
        : String(organizationId);
      const id = parseInt(idStr, 10);
      return isNaN(id) ? null : id;
    }

    return null;
  },
);
