import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Interview } from '../entities/interview.entity';
import { User } from '../../auth/entities/user.entity';

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private oauth2Client: OAuth2Client;
  private calendar: ReturnType<typeof google.calendar>;

  constructor(private configService: ConfigService) {
    this.initializeOAuth2Client();
  }

  private initializeOAuth2Client() {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>(
      'GOOGLE_REDIRECT_URI',
      'http://localhost:3000/auth/google/callback',
    );

    if (!clientId || !clientSecret) {
      this.logger.warn(
        'Google Calendar credentials not configured. Calendar sync will be disabled.',
      );
      return;
    }

    this.oauth2Client = new OAuth2Client({
      clientId,
      clientSecret,
      redirectUri,
    });

    const refreshToken = this.configService.get<string>('GOOGLE_REFRESH_TOKEN');
    if (refreshToken) {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });
      this.refreshAccessToken().catch((error) => {
        const errorMessage =
          error instanceof Error ? error.message : 'Erreur inconnue';
        this.logger.warn(
          `Impossible de rafraîchir l'access token au démarrage: ${errorMessage}`,
        );
      });
    }

    this.calendar = google.calendar({
      version: 'v3',
      auth: this.oauth2Client,
    });
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.oauth2Client) {
      throw new Error('Google OAuth2 client not initialized');
    }

    const refreshToken = this.configService.get<string>('GOOGLE_REFRESH_TOKEN');
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');

    if (!refreshToken) {
      throw new Error(
        "GOOGLE_REFRESH_TOKEN non configuré dans les variables d'environnement",
      );
    }

    try {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();
      this.oauth2Client.setCredentials(credentials);
      this.logger.log('Access token rafraîchi avec succès');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';

      this.logger.error(
        `Erreur lors du rafraîchissement de l'access token: ${errorMessage}`,
      );
      if (errorMessage.includes('unauthorized_client')) {
        this.logger.error(
          `ERREUR: Le Client ID/Secret ne correspond pas au refresh token.`,
        );
        this.logger.error(
          `Client ID configuré: ${clientId?.substring(0, 20)}...`,
        );
        this.logger.error(
          `Vérifiez que le refresh token a été obtenu avec les mêmes Client ID/Secret que ceux dans votre .env`,
        );
        throw new Error(
          `unauthorized_client: Le Client ID ou Client Secret ne correspond pas au refresh token. Vérifiez que vous utilisez les mêmes credentials que ceux utilisés pour obtenir le refresh token.`,
        );
      }

      throw new Error(
        `Impossible de rafraîchir l'access token: ${errorMessage}`,
      );
    }
  }

  private async ensureValidAccessToken(): Promise<void> {
    if (!this.oauth2Client) {
      throw new Error('Google OAuth2 client not initialized');
    }

    const credentials = this.oauth2Client.credentials;
    if (
      !credentials.access_token ||
      this.isTokenExpired(credentials.expiry_date)
    ) {
      await this.refreshAccessToken();
    }
  }

  private isTokenExpired(expiryDate?: number | null): boolean {
    if (!expiryDate) {
      return true;
    }
    return Date.now() >= expiryDate - 5 * 60 * 1000;
  }

  getAuthUrl(): string {
    if (!this.oauth2Client) {
      throw new Error('Google OAuth2 client not initialized');
    }

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });
  }

  async getTokenFromCode(code: string): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    if (!this.oauth2Client) {
      throw new Error('Google OAuth2 client not initialized');
    }

    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);

    return {
      access_token: tokens.access_token || '',
      refresh_token: tokens.refresh_token || '',
    };
  }

  setRefreshToken(refreshToken: string) {
    if (!this.oauth2Client) {
      this.initializeOAuth2Client();
    }
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });
  }

  async createEvent(
    interview: Interview,
    candidate: { firstName: string; lastName: string; email: string },
    participants: User[],
  ): Promise<string> {
    if (!this.calendar) {
      this.logger.warn(
        'Google Calendar not configured. Skipping event creation.',
      );
      return '';
    }

    try {
      await this.ensureValidAccessToken();

      const interviewDate =
        interview.date instanceof Date
          ? interview.date
          : typeof interview.date === 'string'
            ? new Date(interview.date)
            : new Date(interview.date as any);

      if (isNaN(interviewDate.getTime())) {
        const dateStr =
          interview.date instanceof Date
            ? interview.date.toISOString()
            : String(interview.date);
        throw new Error(
          `Date d'entretien invalide: ${dateStr} (type: ${typeof interview.date})`,
        );
      }

      const startDateTime = this.calculateDateTime(
        interviewDate,
        interview.startTime,
      );
      const endDateTime = new Date(startDateTime);
      endDateTime.setMinutes(endDateTime.getMinutes() + interview.duration);

      const attendees = [
        { email: candidate.email },
        ...participants.map((p) => ({ email: p.email })),
      ];

      const event = {
        summary: interview.title,
        description: interview.description || '',
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: this.configService.get<string>('TIMEZONE', 'Europe/Paris'),
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: this.configService.get<string>('TIMEZONE', 'Europe/Paris'),
        },
        location: interview.location || '',
        attendees: attendees,
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 15 },
          ],
        },
        conferenceData: interview.meetingLink
          ? {
              createRequest: {
                requestId: `interview-${interview.id}`,
                conferenceSolutionKey: { type: 'hangoutsMeet' },
              },
            }
          : undefined,
      };

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        sendUpdates: 'all',
      });

      const eventId = response.data.id || '';
      const htmlLink = response.data.htmlLink || '';
      const iCalUID = response.data.iCalUID || '';

      this.logger.log(
        `Événement Google Calendar créé: ${eventId} pour l'entretien ${interview.id}`,
      );
      this.logger.log(`Lien Google Calendar: ${htmlLink}`);
      this.logger.log(`iCalUID: ${iCalUID}`);

      return eventId;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(
        `Erreur lors de la création de l'événement Google Calendar: ${errorMessage}`,
      );
      throw new Error(
        `Impossible de créer l'événement dans Google Calendar: ${errorMessage}`,
      );
    }
  }

  async updateEvent(
    eventId: string,
    interview: Interview,
    candidate: { firstName: string; lastName: string; email: string },
    participants: User[],
  ): Promise<void> {
    if (!this.calendar) {
      this.logger.warn(
        'Google Calendar not configured. Skipping event update.',
      );
      return;
    }

    if (!eventId) {
      this.logger.warn(`Pas d'ID d'événement pour l'entretien ${interview.id}`);
      return;
    }

    try {
      await this.ensureValidAccessToken();
      const existingEvent = await this.calendar.events.get({
        calendarId: 'primary',
        eventId: eventId,
      });

      const interviewDate =
        interview.date instanceof Date
          ? interview.date
          : typeof interview.date === 'string'
            ? new Date(interview.date)
            : new Date(interview.date as any);

      if (isNaN(interviewDate.getTime())) {
        const dateStr =
          interview.date instanceof Date
            ? interview.date.toISOString()
            : String(interview.date);
        throw new Error(
          `Date d'entretien invalide: ${dateStr} (type: ${typeof interview.date})`,
        );
      }

      const startDateTime = this.calculateDateTime(
        interviewDate,
        interview.startTime,
      );
      const endDateTime = new Date(startDateTime);
      endDateTime.setMinutes(endDateTime.getMinutes() + interview.duration);

      const attendees = [
        { email: candidate.email },
        ...participants.map((p) => ({ email: p.email })),
      ];

      const updatedEvent = {
        summary: interview.title,
        description: interview.description || '',
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: this.configService.get<string>('TIMEZONE', 'Europe/Paris'),
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: this.configService.get<string>('TIMEZONE', 'Europe/Paris'),
        },
        location: interview.location || '',
        attendees: attendees,
        reminders: existingEvent.data.reminders || {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 15 },
          ],
        },
      };

      await this.calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        requestBody: updatedEvent,
        sendUpdates: 'all',
      });

      this.logger.log(
        `Événement Google Calendar mis à jour: ${eventId} pour l'entretien ${interview.id}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(
        `Erreur lors de la mise à jour de l'événement Google Calendar: ${errorMessage}`,
      );
      throw new Error(
        `Impossible de mettre à jour l'événement dans Google Calendar: ${errorMessage}`,
      );
    }
  }

  async deleteEvent(eventId: string): Promise<void> {
    if (!this.calendar) {
      this.logger.warn(
        'Google Calendar not configured. Skipping event deletion.',
      );
      return;
    }

    if (!eventId) {
      return;
    }

    try {
      await this.ensureValidAccessToken();

      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
        sendUpdates: 'all',
      });

      this.logger.log(`Événement Google Calendar supprimé: ${eventId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(
        `Erreur lors de la suppression de l'événement Google Calendar: ${errorMessage}`,
      );
      this.logger.warn(
        `L'événement ${eventId} n'a pas pu être supprimé de Google Calendar, mais l'entretien sera supprimé`,
      );
    }
  }

  private calculateDateTime(date: Date | string, startTime: string): Date {
    try {
      let dateObj: Date;

      if (date instanceof Date) {
        dateObj = date;
      } else if (typeof date === 'string') {
        dateObj = new Date(date);
      } else {
        const dateStr = String(date);
        this.logger.warn(
          `Format de date inattendu: ${typeof date}, valeur: ${dateStr}`,
        );
        dateObj = new Date(date as any);
      }

      if (isNaN(dateObj.getTime())) {
        const dateStr =
          date instanceof Date ? date.toISOString() : String(date);
        throw new Error(`Date invalide: ${dateStr} (type: ${typeof date})`);
      }

      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const timeMatch = startTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      if (!timeMatch) {
        throw new Error(`Format d'heure invalide: ${startTime}`);
      }
      const hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);

      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        throw new Error(`Heure invalide: ${startTime}`);
      }

      const dateTimeStr = `${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

      const dateTime = new Date(dateTimeStr);

      if (isNaN(dateTime.getTime())) {
        throw new Error(`Date/heure invalide après conversion: ${dateTimeStr}`);
      }

      return dateTime;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      const dateStr = date instanceof Date ? date.toISOString() : String(date);
      this.logger.error(
        `Erreur dans calculateDateTime: ${errorMessage}, date: ${dateStr}, startTime: ${startTime}`,
      );
      throw error;
    }
  }

  async getCalendarInfo(): Promise<{
    configured: boolean;
    calendarId?: string;
    calendarSummary?: string;
    userEmail?: string;
    timezone?: string;
  }> {
    if (!this.calendar || !this.oauth2Client) {
      return { configured: false };
    }

    try {
      await this.ensureValidAccessToken();

      const calendarResponse = await this.calendar.calendars.get({
        calendarId: 'primary',
      });

      const oauth2 = google.oauth2({
        version: 'v2',
        auth: this.oauth2Client,
      });
      const userInfo = await oauth2.userinfo.get();

      return {
        configured: true,
        calendarId: 'primary',
        calendarSummary:
          calendarResponse.data.summary || 'Calendrier principal',
        userEmail: userInfo.data.email || undefined,
        timezone: this.configService.get<string>('TIMEZONE', 'Europe/Paris'),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(
        `Erreur lors de la récupération des informations du calendrier: ${errorMessage}`,
      );
      return {
        configured: true,
        calendarId: 'primary',
      };
    }
  }

  isConfigured(): boolean {
    return !!this.calendar && !!this.oauth2Client;
  }
}
