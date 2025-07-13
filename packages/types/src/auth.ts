import { UserRole } from "./user";

export interface JWTClaims {
  sub: string; // user id
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
  jti?: string; // JWT ID for blacklisting
}

export interface AccessToken {
  token: string;
  expiresAt: Date;
}

export interface RefreshToken {
  token: string;
  expiresAt: Date;
}

export interface AuthTokens {
  accessToken: AccessToken;
  refreshToken: RefreshToken;
}

export interface Session {
  id: string;
  userId: string;
  refreshToken: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt: Date;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
}

export interface RolePermission {
  role: UserRole;
  permissions: Permission[];
}