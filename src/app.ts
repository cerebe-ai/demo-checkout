import express from "express";
import { loadConfig } from "./config.js";
import { login, requireSession, type AuthedRequest } from "./auth.js";
import { checkoutQuote, type LineItem } from "./billing.js";
import { giftCardBalance } from "./giftcards.js";

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

    let giftCardBalanceCents = 0;
    const giftCard = req.body?.giftCard;
    if (giftCard != null) {
      if (typeof giftCard.balanceCents === "number") {
        giftCardBalanceCents = giftCard.balanceCents;
      } else if (typeof giftCard.code !== "string" || giftCard.code.length === 0) {
        res.status(400).json({ error: "gift card code must be a string" });
        return;
      } else {
        const known = giftCardBalance(giftCard.code);
        if (known === undefined) {
          giftCardBalanceCents = 0;
        } else {
          giftCardBalanceCents = known;
        }
      }
    }

    try {
      const quote = checkoutQuote(items, config.taxRateBasisPoints, giftCardBalanceCents);
      res.json({ userId: req.userId, currency: config.currency, ...quote });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  return app;
}
