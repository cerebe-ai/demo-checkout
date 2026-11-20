import express from "express";
import { loadConfig } from "./config.js";
import { login, requireSession, type AuthedRequest } from "./auth.js";
import { totals, type LineItem } from "./billing.js";

export function createApp() {
  const config = loadConfig();
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/login", login(config.sessionTtlSeconds));

  app.post("/checkout", requireSession, (req: AuthedRequest, res) => {
    const items = (req.body?.items ?? []) as LineItem[];
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "items are required" });
      return;
    }
    const shippingMethod = req.body?.shippingMethod ?? "standard";
    if (typeof shippingMethod !== "string") {
      res.status(400).json({ error: "shippingMethod must be a string" });
      return;
    }
    let shippingCents: number;
    if (shippingMethod === "standard") {
      shippingCents = config.standardShippingCents;
    } else if (shippingMethod === "express") {
      shippingCents = config.expressShippingCents;
    } else {
      res.status(400).json({ error: "unknown shipping method" });
      return;
    }
    try {
      res.json({
        userId: req.userId,
        currency: config.currency,
        shippingMethod,
        ...totals(items, config.taxRateBasisPoints, shippingCents),
      });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  return app;
}
