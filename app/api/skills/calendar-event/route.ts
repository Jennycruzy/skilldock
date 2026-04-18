import { NextRequest } from 'next/server';
import { withPurchPayment } from '@/lib/payment-middleware';
import { google } from 'googleapis';

async function handler(req: NextRequest): Promise<Record<string, unknown>> {
  const body = await req.json();
  const {
    title,
    startTime,
    endTime,
    attendeeEmails,
    description = '',
    meetingLink,
    timezone = 'UTC',
  } = body as {
    title: string;
    startTime: string;
    endTime: string;
    attendeeEmails: string[];
    description?: string;
    meetingLink?: string;
    timezone?: string;
  };

  if (!title || !startTime || !endTime || !attendeeEmails?.length) {
    throw new Error('title, startTime, endTime, and attendeeEmails are required');
  }

  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  if (!serviceAccountJson || !calendarId) {
    throw new Error('Google Calendar not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON and GOOGLE_CALENDAR_ID env vars.');
  }

  // Decode base64 service account
  const credentials = JSON.parse(
    Buffer.from(serviceAccountJson, 'base64').toString('utf-8')
  );

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });

  const calendar = google.calendar({ version: 'v3', auth });

  let eventDescription = description;
  if (meetingLink) {
    eventDescription = `${description}\n\nMeeting Link: ${meetingLink}`.trim();
  }

  const eventBody: Record<string, unknown> = {
    summary: title,
    description: eventDescription,
    start: { dateTime: startTime, timeZone: timezone },
    end: { dateTime: endTime, timeZone: timezone },
    attendees: attendeeEmails.map((email: string) => ({ email })),
    conferenceData: meetingLink
      ? {
          entryPoints: [{ entryPointType: 'video', uri: meetingLink, label: 'Join Meeting' }],
        }
      : undefined,
  };

  const response = await calendar.events.insert({
    calendarId,
    requestBody: eventBody,
    sendUpdates: 'all',
    conferenceDataVersion: meetingLink ? 1 : 0,
  });

  const event = response.data;
  const eventId = event.id || '';
  const calendarLink = event.htmlLink || `https://calendar.google.com/calendar/event?eid=${Buffer.from(eventId).toString('base64')}`;

  return {
    eventId,
    calendarLink,
    title: event.summary || title,
    startTime: event.start?.dateTime || startTime,
    endTime: event.end?.dateTime || endTime,
    attendeeEmails,
    invitesSent: true,
    createdAt: new Date().toISOString(),
  };
}

export const POST = withPurchPayment({
  price: 0.015,
  description: 'Calendar Event Creator — create Google Calendar events with invites',
  skillId: 'calendar-event',
})(handler);
