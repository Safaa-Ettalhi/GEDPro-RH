import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import type { RequestWithUser } from '../common/interfaces/user-request.interface';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getAll(
    @Request() req: RequestWithUser,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    return this.notificationsService.getAllNotifications(
      req.user.id,
      req.user.role,
      organizationId,
      limit ? parseInt(limit, 10) : 50,
      skip ? parseInt(skip, 10) : 0,
    );
  }

  @Get('unread')
  async getUnread(
    @Request() req: RequestWithUser,
    @Query('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.notificationsService.getUnreadNotifications(
      req.user.id,
      req.user.role,
      organizationId,
    );
  }

  @Get('count')
  async getUnreadCount(
    @Request() req: RequestWithUser,
    @Query('organizationId', ParseIntPipe) organizationId: number,
  ) {
    const count = await this.notificationsService.getUnreadCount(
      req.user.id,
      req.user.role,
      organizationId,
    );
    return { count };
  }

  @Post(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Query('organizationId', ParseIntPipe) organizationId: number,
  ) {
    await this.notificationsService.markAsRead(
      id,
      req.user.id,
      organizationId,
    );
    return { success: true };
  }

  @Post('read-all')
  async markAllAsRead(
    @Request() req: RequestWithUser,
    @Query('organizationId', ParseIntPipe) organizationId: number,
  ) {
    await this.notificationsService.markAllAsRead(
      req.user.id,
      organizationId,
    );
    return { success: true };
  }
}
