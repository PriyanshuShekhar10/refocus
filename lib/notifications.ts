// Notification service for session reminders and alerts

export interface NotificationConfig {
  emailReminders: boolean;
  pushNotifications: boolean;
  browserAlerts: boolean;
  reminderMinutes: number[];
}

export interface SessionNotification {
  id: string;
  sessionId: string;
  userId: string;
  type: 'reminder' | 'upcoming' | 'start' | 'cancelled' | 'rescheduled';
  scheduledFor: Date;
  sent: boolean;
  sentAt?: Date;
  method: 'email' | 'push' | 'browser';
}

export interface EmailNotification {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface PushNotification {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  icon?: string;
  badge?: string;
}

export interface BrowserNotification {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
}

// Mock notification service
// In production, integrate with actual email, push notification, and browser notification services
export class NotificationService {
  private config: NotificationConfig;
  private notifications: SessionNotification[] = [];

  constructor(config: NotificationConfig) {
    this.config = config;
    this.initializeBrowserNotifications();
  }

  /**
   * Initialize browser notification permissions
   */
  private async initializeBrowserNotifications() {
    if ('Notification' in window && this.config.browserAlerts) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    }
  }

  /**
   * Schedule notifications for a session
   */
  async scheduleSessionNotifications(session: {
    id: string;
    start: string;
    durationMin: number;
    title?: string;
    sessionType: string;
    userId: string;
    userEmail?: string;
  }) {
    const sessionStart = new Date(session.start);
    const notifications: SessionNotification[] = [];

    // Schedule reminder notifications
    for (const minutes of this.config.reminderMinutes) {
      const reminderTime = new Date(sessionStart.getTime() - minutes * 60 * 1000);
      
      if (reminderTime > new Date()) {
        // Email reminder
        if (this.config.emailReminders && session.userEmail) {
          notifications.push({
            id: `email-${session.id}-${minutes}`,
            sessionId: session.id,
            userId: session.userId,
            type: 'reminder',
            scheduledFor: reminderTime,
            sent: false,
            method: 'email'
          });
        }

        // Push notification reminder
        if (this.config.pushNotifications) {
          notifications.push({
            id: `push-${session.id}-${minutes}`,
            sessionId: session.id,
            userId: session.userId,
            type: 'reminder',
            scheduledFor: reminderTime,
            sent: false,
            method: 'push'
          });
        }

        // Browser notification reminder
        if (this.config.browserAlerts) {
          notifications.push({
            id: `browser-${session.id}-${minutes}`,
            sessionId: session.id,
            userId: session.userId,
            type: 'reminder',
            scheduledFor: reminderTime,
            sent: false,
            method: 'browser'
          });
        }
      }
    }

    // Schedule session start notification
    if (sessionStart > new Date()) {
      if (this.config.browserAlerts) {
        notifications.push({
          id: `browser-start-${session.id}`,
          sessionId: session.id,
          userId: session.userId,
          type: 'start',
          scheduledFor: sessionStart,
          sent: false,
          method: 'browser'
        });
      }
    }

    this.notifications.push(...notifications);
    this.scheduleNotifications();
  }

  /**
   * Schedule all pending notifications
   */
  private scheduleNotifications() {
    const now = new Date();
    
    this.notifications
      .filter(n => !n.sent && n.scheduledFor > now)
      .forEach(notification => {
        const delay = notification.scheduledFor.getTime() - now.getTime();
        
        setTimeout(() => {
          this.sendNotification(notification);
        }, delay);
      });
  }

  /**
   * Send a specific notification
   */
  private async sendNotification(notification: SessionNotification) {
    try {
      switch (notification.method) {
        case 'email':
          await this.sendEmailNotification(notification);
          break;
        case 'push':
          await this.sendPushNotification(notification);
          break;
        case 'browser':
          await this.sendBrowserNotification(notification);
          break;
      }

      // Mark as sent
      const index = this.notifications.findIndex(n => n.id === notification.id);
      if (index !== -1) {
        this.notifications[index] = {
          ...notification,
          sent: true,
          sentAt: new Date()
        };
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(notification: SessionNotification) {
    // Mock email sending - integrate with your email service (SendGrid, AWS SES, etc.)
    console.log('Sending email notification:', notification);
    
    // In production, use actual email service:
    /*
    const emailData: EmailNotification = {
      to: userEmail,
      subject: 'Focus Session Reminder',
      html: this.generateEmailHTML(notification),
      text: this.generateEmailText(notification)
    };
    
    await emailService.send(emailData);
    */
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(notification: SessionNotification) {
    // Mock push notification - integrate with Firebase, OneSignal, etc.
    console.log('Sending push notification:', notification);
    
    // In production, use actual push service:
    /*
    const pushData: PushNotification = {
      userId: notification.userId,
      title: 'Focus Session Reminder',
      body: this.generatePushBody(notification),
      data: { sessionId: notification.sessionId }
    };
    
    await pushService.send(pushData);
    */
  }

  /**
   * Send browser notification
   */
  private async sendBrowserNotification(notification: SessionNotification) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotification: BrowserNotification = {
        title: 'Focus Session Reminder',
        body: this.generateBrowserBody(notification),
        icon: '/favicon.ico',
        tag: notification.sessionId,
        requireInteraction: true
      };

      new Notification(browserNotification.title, browserNotification);
    }
  }

  /**
   * Generate email HTML content
   */
  private generateEmailHTML(notification: SessionNotification): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Focus Session Reminder</h2>
        <p>Your focus session is starting soon!</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Session Details</h3>
          <p><strong>Time:</strong> ${notification.scheduledFor.toLocaleString()}</p>
          <p><strong>Type:</strong> ${notification.type}</p>
        </div>
        <p>Click <a href="${window.location.origin}/dashboard">here</a> to join your session.</p>
      </div>
    `;
  }

  /**
   * Generate email text content
   */
  private generateEmailText(notification: SessionNotification): string {
    return `
Focus Session Reminder

Your focus session is starting soon!

Session Details:
- Time: ${notification.scheduledFor.toLocaleString()}
- Type: ${notification.type}

Visit ${window.location.origin}/dashboard to join your session.
    `;
  }

  /**
   * Generate push notification body
   */
  private generatePushBody(notification: SessionNotification): string {
    return `Your focus session starts at ${notification.scheduledFor.toLocaleTimeString()}`;
  }

  /**
   * Generate browser notification body
   */
  private generateBrowserBody(notification: SessionNotification): string {
    return `Your focus session starts at ${notification.scheduledFor.toLocaleTimeString()}`;
  }

  /**
   * Cancel notifications for a session
   */
  cancelSessionNotifications(sessionId: string) {
    this.notifications = this.notifications.filter(n => n.sessionId !== sessionId);
  }

  /**
   * Update notification configuration
   */
  updateConfig(newConfig: NotificationConfig) {
    this.config = newConfig;
    this.initializeBrowserNotifications();
  }

  /**
   * Get notification history
   */
  getNotificationHistory(userId?: string): SessionNotification[] {
    return this.notifications.filter(n => !userId || n.userId === userId);
  }

  /**
   * Send immediate notification (for testing)
   */
  async sendImmediateNotification(
    userId: string,
    type: SessionNotification['type'],
    method: SessionNotification['method'],
    sessionId: string
  ) {
    const notification: SessionNotification = {
      id: `immediate-${Date.now()}`,
      sessionId,
      userId,
      type,
      scheduledFor: new Date(),
      sent: false,
      method
    };

    await this.sendNotification(notification);
  }
}

// Initialize notification service
export const notificationService = new NotificationService({
  emailReminders: true,
  pushNotifications: true,
  browserAlerts: true,
  reminderMinutes: [5, 10]
});

// Utility functions for external calendar integration
export class ExternalCalendarService {
  /**
   * Connect to Google Calendar
   */
  async connectGoogleCalendar(): Promise<boolean> {
    // Mock implementation - integrate with Google Calendar API
    console.log('Connecting to Google Calendar...');
    
    // In production:
    /*
    try {
      const authResult = await googleCalendar.authenticate();
      const calendar = await googleCalendar.getCalendar();
      return true;
    } catch (error) {
      console.error('Google Calendar connection failed:', error);
      return false;
    }
    */
    
    return true; // Mock success
  }

  /**
   * Connect to Apple Calendar
   */
  async connectAppleCalendar(): Promise<boolean> {
    // Mock implementation - integrate with Apple Calendar API
    console.log('Connecting to Apple Calendar...');
    return true; // Mock success
  }

  /**
   * Connect to Outlook Calendar
   */
  async connectOutlookCalendar(): Promise<boolean> {
    // Mock implementation - integrate with Microsoft Graph API
    console.log('Connecting to Outlook Calendar...');
    return true; // Mock success
  }

  /**
   * Sync session to external calendar
   */
  async syncSessionToCalendar(
    provider: 'google' | 'apple' | 'outlook',
    session: {
      title: string;
      start: Date;
      end: Date;
      description?: string;
      location?: string;
    }
  ): Promise<boolean> {
    console.log(`Syncing session to ${provider}:`, session);
    
    // In production, create calendar event:
    /*
    try {
      const event = {
        summary: session.title,
        start: { dateTime: session.start.toISOString() },
        end: { dateTime: session.end.toISOString() },
        description: session.description,
        location: session.location
      };
      
      await calendarService.createEvent(provider, event);
      return true;
    } catch (error) {
      console.error('Calendar sync failed:', error);
      return false;
    }
    */
    
    return true; // Mock success
  }

  /**
   * Check for conflicts with external calendar
   */
  async checkConflicts(
    provider: 'google' | 'apple' | 'outlook',
    start: Date,
    end: Date
  ): Promise<boolean> {
    console.log(`Checking conflicts in ${provider} calendar:`, { start, end });
    
    // In production, check for existing events:
    /*
    try {
      const events = await calendarService.getEvents(provider, start, end);
      return events.length > 0;
    } catch (error) {
      console.error('Conflict check failed:', error);
      return false;
    }
    */
    
    return false; // Mock no conflicts
  }
}

export const externalCalendarService = new ExternalCalendarService();

