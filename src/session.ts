import { randomBytes } from "node:crypto";

export interface Session {
  token: string;
  userId: string;
  expiresAt: number;
}

const sessions = new Map<string, Session>();

export function createSession(userId: string, ttlSeconds: number, now = Date.now()): Session {
  const token = randomBytes(24).toString("base64url");
  const session = { token, userId, expiresAt: now + ttlSeconds * 1000 };
  sessions.set(token, session);
  return session;
}

export function getSession(token: string, now = Date.now()): Session | undefined {
  const session = sessions.get(token);
  if (!session) return undefined;
  if (session.expiresAt <= now) {
    sessions.delete(token);
    return undefined;
  }
  return session;
}

export function refreshSession(token: string, ttlSeconds: number, now = Date.now()): Session | undefined {
  const current = getSession(token, now);
  if (!current) return undefined;
  sessions.delete(token);
  return createSession(current.userId, ttlSeconds, now);
}

export function revokeSession(token: string): void {
  sessions.delete(token);
}
