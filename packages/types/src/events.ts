export enum EventType {
  USER_REGISTERED = "user.registered",
  USER_LOGIN = "user.login",
  USER_LOGOUT = "user.logout",
  USER_UPDATED = "user.updated",
  USER_DELETED = "user.deleted",
  USER_PASSWORD_RESET_REQUESTED = "user.password_reset_requested",
  USER_PASSWORD_RESET = "user.password_reset",
  USER_EMAIL_VERIFICATION_REQUESTED = "user.email_verification_requested",
  USER_EMAIL_VERIFIED = "user.email_verified",
  EMAIL_SEND = "email.send",
  NOTIFICATION_SEND = "notification.send"
}

export interface BaseEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  correlationId?: string;
  metadata?: Record<string, any>;
}

export interface UserRegisteredEvent extends BaseEvent {
  type: EventType.USER_REGISTERED;
  data: {
    userId: string;
    email: string;
    requiresEmailVerification: boolean;
  };
}

export interface EmailSendEvent extends BaseEvent {
  type: EventType.EMAIL_SEND;
  data: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    templateId?: string;
    templateData?: Record<string, any>;
    htmlContent?: string;
    textContent?: string;
    attachments?: Array<{
      filename: string;
      content: string;
      contentType: string;
    }>;
  };
}

export interface NotificationSendEvent extends BaseEvent {
  type: EventType.NOTIFICATION_SEND;
  data: {
    userId: string;
    type: "push" | "in-app" | "sms";
    title: string;
    message: string;
    data?: Record<string, any>;
  };
}

export type DomainEvent = 
  | UserRegisteredEvent
  | EmailSendEvent
  | NotificationSendEvent;

export interface QueueMessage<T = any> {
  id: string;
  event: T;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  processedAt?: Date;
  error?: string;
}