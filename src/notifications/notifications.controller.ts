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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import type { RequestWithUser } from '../common/interfaces/user-request.interface';

@ApiTags('notifications')
@ApiBearerAuth('JWT-auth')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Récupérer toutes les notifications' })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Nombre de résultats (défaut: 50)',
  })
  @ApiQuery({
    name: 'skip',
    type: Number,
    required: false,
    description: 'Nombre de résultats à ignorer (défaut: 0)',
  })
  @ApiResponse({ status: 200, description: 'Liste des notifications' })
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
  @ApiOperation({ summary: 'Récupérer les notifications non lues' })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiResponse({ status: 200, description: 'Liste des notifications non lues' })
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
  @ApiOperation({ summary: 'Récupérer le nombre de notifications non lues' })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiResponse({ status: 200, description: 'Nombre de notifications non lues' })
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
  @ApiOperation({ summary: 'Marquer une notification comme lue' })
  @ApiParam({ name: 'id', type: String, description: 'ID de la notification' })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiResponse({ status: 200, description: 'Notification marquée comme lue' })
  async markAsRead(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Query('organizationId', ParseIntPipe) organizationId: number,
  ) {
    await this.notificationsService.markAsRead(id, req.user.id, organizationId);
    return { success: true };
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Marquer toutes les notifications comme lues' })
  @ApiQuery({ name: 'organizationId', type: Number, required: true })
  @ApiResponse({
    status: 200,
    description: 'Toutes les notifications marquées comme lues',
  })
  async markAllAsRead(
    @Request() req: RequestWithUser,
    @Query('organizationId', ParseIntPipe) organizationId: number,
  ) {
    await this.notificationsService.markAllAsRead(req.user.id, organizationId);
    return { success: true };
  }
}
