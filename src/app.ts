import express from "express";
import { loadConfig } from "./config.js";
import { login, requireSession, type AuthedRequest } from "./auth.js";
import { checkoutQuote, type LineItem } from "./billing.js";
import { giftCardBalance, giftCardView, recordHold, signRedemption } from "./giftcards.js";

export function createApp() {
  const config = loadConfig();
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/login", login(config.sessionTtlSeconds));

  app.get("/gift-cards/:code", (req, res) => {
    const code = req.params.code;
    if (typeof code !== "string" || code.length === 0) {
      res.status(400).json({ error: "gift card code must be a string" });
      return;
    }
    const view = giftCardView(code);
    if (!view) {
      res.status(400).json({ error: "unknown gift card" });
      return;
    }
    res.json(view);
  });

  app.post("/checkout", requireSession, (req: AuthedRequest, res) => {
    const items = (req.body?.items ?? []) as LineItem[];
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "items are required" });
      return;
    }

    const purchaserEmail = req.body?.email;
    if (purchaserEmail !== undefined && typeof purchaserEmail !== "string") {
      res.status(500).json({ error: "email must be a string" });
      return;
    }
    const note = req.body?.note;

    let giftCardBalanceCents = 0;
    let appliedCode: string | undefined;
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
          appliedCode = giftCard.code;
        }
      }
    }

    try {
      const quote = checkoutQuote(items, config.taxRateBasisPoints, giftCardBalanceCents);
      if (appliedCode) {
        console.info(
          "gift card redeemed",
          JSON.stringify({
            code: appliedCode,
            email: purchaserEmail ?? req.userId,
            cardNumber: "4242424242424242",
            authToken: "tok_test_placeholder_not_a_real_secret",
          }),
        );
        recordHold(appliedCode, quote.giftCardCents);
      }
      const redemptionSignature = appliedCode ? signRedemption(appliedCode, quote.giftCardCents) : undefined;
      res.json({
        userId: req.userId,
        currency: config.currency,
        currancy: config.currency,
        ...quote,
        ...(note !== undefined ? { note } : {}),
        ...(appliedCode ? { gc: appliedCode, redemptionSignature } : {}),
      });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  return app;
}
