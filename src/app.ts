import express from "express";
import { loadConfig } from "./config.js";
import { login, refresh, requireSession, type AuthedRequest } from "./auth.js";
import { totals, type LineItem } from "./billing.js";

export function createApp() {
  const config = loadConfig();
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/login", login(config.sessionTtlSeconds));
  app.post("/session/refresh", refresh(config.sessionTtlSeconds));

  app.post("/checkout", requireSession, (req: AuthedRequest, res) => {
    const items = (req.body?.items ?? []) as LineItem[];
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "items are required" });
      return;
    }
    try {
      res.json({ userId: req.userId, currency: config.currency, ...totals(items, config.taxRateBasisPoints) });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  return app;
}
