/**
 * Notification Channel Abstraction
 */
export interface NotificationPayload {
  recipientId: string;
  recipientContact: string; // email, phone number, device token
  subject: string;
  body: string; // Plain text or HTML
  metadata?: Record<string, any>;
}

export interface INotificationProvider {
  readonly channel: 'EMAIL' | 'SMS' | 'PUSH' | 'WHATSAPP';
  send(payload: NotificationPayload): Promise<boolean>;
}

// ---------------------------------------------------------
// Example Implementation
// ---------------------------------------------------------
export class SmtpEmailProvider implements INotificationProvider {
  readonly channel = 'EMAIL';

  async send(payload: NotificationPayload): Promise<boolean> {
    // Implement Nodemailer / AWS SES logic here
    // console.log(`[EMAIL SENT] To: ${payload.recipientContact} | Subject: ${payload.subject}`);
    return true;
  }
}
