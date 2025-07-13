export interface User {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  isEmailVerified: boolean;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

export interface UserCreatePayload {
  email: string;
  password: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
}

export interface UserUpdatePayload {
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface UserLoginPayload {
  email: string;
  password: string;
}

export interface UserPasswordResetRequestPayload {
  email: string;
}

export interface UserPasswordResetPayload {
  token: string;
  newPassword: string;
}

export interface UserEmailVerificationPayload {
  token: string;
}
