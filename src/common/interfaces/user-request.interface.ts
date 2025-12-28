import { Request } from 'express';
import { Role } from '../enums/role.enum';

export interface UserPayload {
  sub: number;
  id: number;
  email: string;
  name: string;
  role: Role;
}

export interface RequestWithUser extends Request {
  user: UserPayload;
}
