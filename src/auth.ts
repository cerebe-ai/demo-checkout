import type { Request, Response, NextFunction } from "express";
import { createSession, getSession, refreshSession } from "./session.js";

export interface AuthedRequest extends Request {
  userId?: string;
}

function bearerToken(req: Request): string {
  const header = req.header("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

export function login(ttlSeconds: number) {
  return (req: Request, res: Response) => {
    const { userId } = req.body ?? {};
    if (typeof userId !== "string" || userId.length === 0) {
      res.status(400).json({ error: "userId is required" });
      return;
    }
    const session = createSession(userId, ttlSeconds);
    res.status(201).json({ token: session.token, expiresAt: session.expiresAt });
  };
}

export function refresh(ttlSeconds: number) {
  return (req: Request, res: Response) => {
    const token = bearerToken(req);
    const session = token ? refreshSession(token, ttlSeconds) : undefined;
    if (!session) {
      res.status(401).json({ error: "a valid session is required" });
      return;
    }
    res.json({ token: session.token, expiresAt: session.expiresAt });
  };
}

export function requireSession(req: AuthedRequest, res: Response, next: NextFunction): void {
  const token = bearerToken(req);
  const session = token ? getSession(token) : undefined;
  if (!session) {
    res.status(401).json({ error: "a valid session is required" });
    return;
  }
  req.userId = session.userId;
  next();
}
