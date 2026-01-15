import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, calendar_v3 } from 'googleapis';
import { JWT } from 'google-auth-library';
import { Interview } from '../entities/interview.entity';
import { User } from '../../auth/entities/user.entity';
import * as fs from 'fs';
import * as path from 'path';

import { ServiceAccountKey } from './google-calendar.types';
import { GoogleCalendarUtils } from './google-calendar.utils';

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private serviceAccountClient: JWT | null = null;
  private calendar: calendar_v3.Calendar | null = null;
  private targetCalendarId: string = 'primary';

  constructor(private configService: ConfigService) {
    this.targetCalendarId = this.configService.get<string>(
      'GOOGLE_CALENDAR_ID',
      'primary',
    );
    this.initializeServiceAccount();
  }

  private initializeServiceAccount() {
    const serviceAccountPath = this.configService.get<string>(
      'GOOGLE_SERVICE_ACCOUNT_PATH',
    );
    const serviceAccountEmail = this.configService.get<string>(
      'GOOGLE_SERVICE_ACCOUNT_EMAIL',
    );

    if (!serviceAccountPath) {
      this.logger.warn('GOOGLE_SERVICE_ACCOUNT_PATH not configured');
      return;
    }

    const fullPath = path.isAbsolute(serviceAccountPath)
      ? serviceAccountPath
      : path.join(process.cwd(), serviceAccountPath);

    if (!fs.existsSync(fullPath)) {
      this.logger.error(`Service Account file not found: ${fullPath}`);
      return;
    }

    try {
      const serviceAccountKey = JSON.parse(
        fs.readFileSync(fullPath, 'utf8'),
      ) as ServiceAccountKey;

      this.serviceAccountClient = new JWT({
        email: serviceAccountKey.client_email,
        key: serviceAccountKey.private_key,
        scopes: [
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/calendar.events',
        ],
      });

      if (
        serviceAccountEmail &&
        serviceAccountEmail !== serviceAccountKey.client_email
      ) {
        this.serviceAccountClient.subject = serviceAccountEmail;
        this.logger.log(`Impersonation (DWD) for: ${serviceAccountEmail}`);
      }

      this.calendar = google.calendar({
        version: 'v3',
        auth: this.serviceAccountClient,
      });

      this.logger.log(
        `Google Calendar initialized with Service Account: ${serviceAccountKey.client_email}`,
      );
      this.logger.log(`Targeting Calendar ID: ${this.targetCalendarId}`);
    } catch (error) {
      this.logger.error(
        `Failed to initialize Service Account: ${GoogleCalendarUtils.getErrorMessage(error)}`,
      );
    }
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
      const event = this.buildEventData(interview, candidate, participants);
      const response = await this.calendar.events.insert({
        calendarId: this.targetCalendarId,
        requestBody: event,
        sendUpdates: 'all',
      });

      const eventId = response.data.id || '';
      this.logger.log(
        `Event created: ${eventId} for interview ${interview.id} in calendar ${this.targetCalendarId}`,
      );
      return eventId;
    } catch (error) {
      this.handleCalendarError(error, 'create');
      throw error;
    }
  }

  async updateEvent(
    eventId: string,
    interview: Interview,
    candidate: { firstName: string; lastName: string; email: string },
    participants: User[],
  ): Promise<void> {
    if (!this.calendar || !eventId) {
      this.logger.warn('Google Calendar not configured or missing eventId');
      return;
    }

    try {
      const existingEvent = await this.calendar.events.get({
        calendarId: this.targetCalendarId,
        eventId: eventId,
      });

      const event = this.buildEventData(
        interview,
        candidate,
        participants,
        existingEvent.data.reminders || undefined,
      );

      await this.calendar.events.update({
        calendarId: this.targetCalendarId,
        eventId: eventId,
        requestBody: event,
        sendUpdates: 'all',
      });

      this.logger.log(
        `Event updated: ${eventId} for interview ${interview.id}`,
      );
    } catch (error) {
      this.handleCalendarError(error, 'update');
      throw error;
    }
  }

  async deleteEvent(eventId: string): Promise<void> {
    if (!this.calendar || !eventId) return;

    try {
      await this.calendar.events.delete({
        calendarId: this.targetCalendarId,
        eventId: eventId,
        sendUpdates: 'all',
      });
      this.logger.log(`Event deleted: ${eventId}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete event: ${GoogleCalendarUtils.getErrorMessage(error)}`,
      );
      this.logger.warn(
        `Event ${eventId} not deleted from Google Calendar, but interview will be deleted`,
      );
    }
  }

  private buildEventData(
    interview: Interview,
    candidate: { email: string },
    participants: User[],
    existingReminders?: {
      useDefault?: boolean | null;
      overrides?: { method?: string | null; minutes?: number | null }[] | null;
    },
  ): calendar_v3.Schema$Event {
    const interviewDate = GoogleCalendarUtils.parseDate(interview.date);
    const startDateTime = GoogleCalendarUtils.calculateDateTime(
      interviewDate,
      interview.startTime,
    );
    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + interview.duration);

    const attendees = [
      { email: candidate.email },
      ...participants.map((p) => ({ email: p.email })),
    ];

    const { description, eventAttendees } = this.processAttendees(
      interview.description || '',
      attendees,
    );

    const timezone = this.configService.get<string>('TIMEZONE', 'Europe/Paris');

    const event: calendar_v3.Schema$Event = {
      summary: interview.title,
      description,
      start: { dateTime: startDateTime.toISOString(), timeZone: timezone },
      end: { dateTime: endDateTime.toISOString(), timeZone: timezone },
      location: interview.location || '',
      reminders: {
        useDefault: existingReminders?.useDefault || false,
        overrides: existingReminders?.overrides || [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 15 },
        ],
      },
    };

    if (interview.meetingLink) {
      event.conferenceData = {
        createRequest: {
          requestId: `interview-${interview.id}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      };
    }

    if (eventAttendees.length > 0) {
      event.attendees = eventAttendees;
    }

    return event;
  }

  private processAttendees(
    description: string,
    attendees: Array<{ email: string }>,
  ): { description: string; eventAttendees: Array<{ email: string }> } {
    const isServiceAccountWithoutDWD =
      this.serviceAccountClient && !this.serviceAccountClient.subject;

    if (isServiceAccountWithoutDWD) {
      const attendeeList = attendees.map((a) => a.email).join(', ');
      return {
        description: `${description}\n\n[Participants: ${attendeeList}]\n(Note: Invitations not sent by Google Calendar - using standard Service Account)`,
        eventAttendees: [],
      };
    }

    return { description, eventAttendees: attendees };
  }

  private handleCalendarError(
    error: unknown,
    operation: 'create' | 'update',
  ): void {
    const errorMessage = GoogleCalendarUtils.getErrorMessage(error);
    this.logger.error(`Error ${operation}ing event: ${errorMessage}`);

    if (errorMessage.includes('unauthorized_client')) {
      this.logger.error(
        'API Google Calendar not enabled. Enable it in Google Cloud Console and restart the server.',
      );
      throw new Error(
        'API Google Calendar not enabled. Enable it in Google Cloud Console, restart the server, and share your calendar with the Service Account.',
      );
    }

    if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
      this.logger.error(
        'Calendar not shared with Service Account. Share your calendar with the Service Account email.',
      );
      throw new Error(
        'Calendar not shared with Service Account. Share your calendar with the Service Account email.',
      );
    }

    throw new Error(
      `Failed to ${operation} event in Google Calendar: ${errorMessage}`,
    );
  }

  async getCalendarInfo(): Promise<{
    configured: boolean;
    calendarId?: string;
    calendarSummary?: string;
    userEmail?: string;
    timezone?: string;
    error?: string;
  }> {
    if (!this.calendar) {
      return { configured: false };
    }

    try {
      if (this.serviceAccountClient) {
        try {
          const accessToken = await this.serviceAccountClient.getAccessToken();
          if (!accessToken.token) {
            throw new Error("Can't get access token");
          }
        } catch (tokenError: any) {
          const errorMessage = GoogleCalendarUtils.getErrorMessage(tokenError);
          return {
            configured: true,
            calendarId: this.targetCalendarId,
            error: `Authorization denied: ${errorMessage}`,
          };
        }
      }

      const calendarResponse = await this.calendar.calendars.get({
        calendarId: this.targetCalendarId,
      });

      const userEmail =
        this.serviceAccountClient?.subject ||
        this.serviceAccountClient?.email ||
        undefined;

      return {
        configured: true,
        calendarId: this.targetCalendarId,
        calendarSummary: calendarResponse.data.summary || 'Primary calendar',
        userEmail,
        timezone: this.configService.get<string>('TIMEZONE', 'Europe/Paris'),
      };
    } catch (error: any) {
      const errorMessage = GoogleCalendarUtils.getErrorMessage(error);
      this.logger.error(`Error getting calendar info: ${errorMessage}`);

      return {
        configured: true,
        calendarId: this.targetCalendarId,
        error: errorMessage,
      };
    }
  }

  isConfigured(): boolean {
    return !!this.calendar;
  }
}
