import { describe, it, expect } from "vitest";
import { UserRole, EventType } from "../index";
import type { User, JWTClaims, DomainEvent } from "../index";

describe("Type Definitions", () => {
  it("should compile user types correctly", () => {
    const user: User = {
      id: "123",
      email: "test@example.com",
      role: UserRole.USER,
      isEmailVerified: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    expect(user.email).toBe("test@example.com");
    expect(user.role).toBe("user");
  });

  it("should compile JWT claims correctly", () => {
    const claims: JWTClaims = {
      sub: "123",
      email: "test@example.com",
      role: UserRole.ADMIN,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    
    expect(claims.role).toBe("admin");
  });

  it("should handle event types correctly", () => {
    const event: DomainEvent = {
      id: "evt-123",
      type: EventType.USER_REGISTERED,
      timestamp: new Date(),
      data: {
        userId: "123",
        email: "test@example.com",
        requiresEmailVerification: true,
      },
    };
    
    expect(event.type).toBe("user.registered");
  });
});