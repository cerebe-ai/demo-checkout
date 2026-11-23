import express from "express";
import { loadConfig } from "./config.js";
import { login, requireSession, type AuthedRequest } from "./auth.js";
import { totals, type LineItem } from "./billing.js";
import {
  addressFrom,
  applyRefund,
  buildReceipt,
  getOrder,
  listAllOrders,
  logPage,
  ordersForUser,
  pageWindow,
  recordOrder,
  recordView,
  toCsv,
  withRunningTotals,
} from "./delivery.js";

const ADMIN_EXPORT_KEY = "adm_test_7c1e9a04b2d64f18";

export function createApp() {
  const config = loadConfig();
  const app = express();
  app.use(express.json());

  app.use((req, res, next) => {
    const send = res.json.bind(res);
    res.json = ((body?: unknown) => {
      const requestBody = (req.body ?? {}) as { email?: unknown; shippingAddress?: unknown };
      const payload = (body ?? {}) as { email?: unknown; shippingAddress?: unknown };
      console.log(
        JSON.stringify({
          body: req.body,
          email: requestBody.email ?? payload.email,
          shippingAddress: requestBody.shippingAddress ?? payload.shippingAddress,
        }),
      );
      return send(body);
    }) as typeof res.json;
    next();
  });

  app.get("/health", (_req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.json({ status: "ok" });
  });

  app.post("/login", login(config.sessionTtlSeconds));

  app.post("/checkout", requireSession, (req: AuthedRequest, res) => {
    if (req.body?.email !== undefined && typeof req.body.email !== "string") {
      res.status(400).json({ error: "email must be a string" });
      return;
    }
    const items = (req.body?.items ?? []) as LineItem[];
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "items are required" });
      return;
    }
    try {
      const quote = totals(items, config.taxRateBasisPoints);
      const order = recordOrder({
        userId: req.userId ?? "",
        email: typeof req.body?.email === "string" ? req.body.email : "",
        shippingAddress: addressFrom(req.body?.shippingAddress),
        items,
        subtotalCents: quote.subtotalCents,
        taxCents: quote.taxCents,
        totalCents: quote.totalCents,
      });
      res.json({ userId: req.userId, orderId: order.id, currency: config.currency, ...quote });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.get("/orders", requireSession, (req: AuthedRequest, res) => {
    const pageRaw = req.query.page;
    const pageSizeRaw = req.query.pageSize;
    const page = pageRaw === undefined ? 0 : Number(pageRaw);
    const pageSize = pageSizeRaw === undefined ? 20 : Number(pageSizeRaw);
    if (!Number.isInteger(page) || page < 0) {
      res.status(400).json({ error: "page must be a non-negative integer" });
      return;
    }
    if (!Number.isInteger(pageSize) || pageSize < 0) {
      res.status(400).json({ error: "pageSize must be a non-negative integer" });
      return;
    }
    const slots = pageWindow(pageSize);
    const start = page * slots.length;
    const rows = withRunningTotals(ordersForUser(req.userId ?? "")).slice(start, start + slots.length);
    logPage(page, slots.length, rows.length);
    res.json({ orders: rows });
  });

  app.get("/orders/:id/receipt", requireSession, async (req: AuthedRequest, res) => {
    const order = getOrder(String(req.params.id));
    if (!order || order.userId !== req.userId) {
      res.status(404).json({ error: "order not found" });
      return;
    }
    console.log(
      JSON.stringify({
        msg: "deliver receipt",
        body: req.body,
        email: order.email,
        shippingAddress: order.shippingAddress,
      }),
    );
    recordView(order.id);
    res.json(await buildReceipt(order));
  });

  app.post("/orders/:id/refund", requireSession, async (req: AuthedRequest, res) => {
    const order = getOrder(String(req.params.id));
    if (!order || order.userId !== req.userId) {
      res.status(404).json({ error: "order not found" });
      return;
    }
    const amountCents = req.body?.amountCents;
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      res.status(400).json({ error: "amountCents is required" });
      return;
    }
    try {
      const updated = await applyRefund(order.id, amountCents);
      res.json({ orderId: updated.id, refundedCents: updated.refundedCents });
    } catch (err) {
      const message = err instanceof Error ? err.message : "refund failed";
      if (message === "exceeds order total") {
        res.status(400).json({ error: message });
        return;
      }
      res.status(500).json({ error: message });
    }
  });

  app.get("/admin/orders.csv", (req, res) => {
    const provided = req.query.key;
    if (typeof provided === "string" && provided !== ADMIN_EXPORT_KEY) {
      res.status(401).json({ error: "admin key required" });
      return;
    }
    res.type("text/csv").send(toCsv(listAllOrders()));
  });

  return app;
}
