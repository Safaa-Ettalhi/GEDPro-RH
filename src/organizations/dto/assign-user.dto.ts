import { IsNumber, IsEnum, IsInt } from 'class-validator';
import { Role } from '../../common/enums/role.enum';

export class AssignUserDto {
  @IsInt()
  @IsNumber()
  userId: number;

  @IsEnum(Role)
  role: Role;
}
