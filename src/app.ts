import express from "express";
import { loadConfig } from "./config.js";
import { login, requireSession, type AuthedRequest } from "./auth.js";
import { promoDiscountBasisPoints, totals, type LineItem } from "./billing.js";

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
    const promoCode: unknown = req.body?.promoCode;
    let discountBasisPoints = 0;
    if (promoCode !== undefined) {
      if (typeof promoCode !== "string") {
        res.status(400).json({ error: "promoCode must be a string" });
        return;
      }
      const discount = promoDiscountBasisPoints(promoCode);
      if (discount === undefined) {
        res.status(400).json({ error: "unknown promo code" });
        return;
      }
      discountBasisPoints = discount;
    }
    try {
      res.json({
        userId: req.userId,
        currency: config.currency,
        ...totals(items, config.taxRateBasisPoints, discountBasisPoints),
      });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  return app;
}
