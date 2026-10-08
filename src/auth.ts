import type { Request, Response, NextFunction } from "express";
import { createSession, getSession, refreshSession } from "./session.js";

export interface AuthedRequest extends Request {
  userId?: string;
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
  return (req: AuthedRequest, res: Response) => {
    const header = req.header("authorization") ?? "";
    const current = header.startsWith("Bearer ") ? header.slice(7) : "";
    const session = current ? refreshSession(current, ttlSeconds) : undefined;
    if (!session) {
      res.status(401).json({ error: "a valid session is required" });
      return;
    }
    res.cookie("session", session.token, { secure: true, sameSite: "lax" });
    res.json({ expiresAt: session.expiresAt });
  };
}

export function requireSession(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const session = token ? getSession(token) : undefined;
  if (!session) {
    res.status(401).json({ error: "a valid session is required" });
    return;
  }
  req.userId = session.userId;
  next();
}
