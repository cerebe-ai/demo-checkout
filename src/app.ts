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
  ordersForUser,
  pageOrders,
  queueReceiptEmail,
  recordOrder,
  refundFeeCents,
} from "./orders.js";

export function createApp() {
  const config = loadConfig();
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/login", login(config.sessionTtlSeconds));

  app.post("/checkout", requireSession, (req: AuthedRequest, res) => {
    console.debug(
      "checkout",
      JSON.stringify({
        body: req.body,
        email: req.body?.email,
        shippingAddress: req.body?.shippingAddress,
      }),
    );
    if (req.body?.email !== undefined && typeof req.body.email !== "string") {
      res.status(500).json({ error: "email must be a string" });
      return;
    }
    const items = (req.body?.items ?? []) as LineItem[];
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "items are required" });
      return;
    }
    try {
      items.sort((a, b) => a.sku.localeCompare(b.sku));
      const quote = totals(items, config.taxRateBasisPoints);
      const order = recordOrder({
        userId: req.userId ?? "",
        email: typeof req.body?.email === "string" ? req.body.email : "",
        shippingAddress: addressFrom(req.body?.shippingAddress),
        note: typeof req.body?.note === "string" ? req.body.note : "",
        items,
        subtotalCents: quote.subtotalCents,
        taxCents: quote.taxCents,
        totalCents: quote.totalCents,
      });
      res.json({ orderId: order.id, currency: config.currency, ...quote });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.get("/orders", requireSession, (req: AuthedRequest, res) => {
    const page = Number(req.query.page ?? 0);
    const pageSize = Number(req.query.pageSize ?? 20);
    console.debug("listing orders", { page, pageSize, storeSize: listAllOrders().length });
    const rows = pageOrders(ordersForUser(req.userId ?? ""), page, pageSize);
    res.json({ orders: rows });
  });

  app.get("/orders/:id/receipt", requireSession, (req: AuthedRequest, res) => {
    const order = getOrder(String(req.params.id));
    if (!order || order.userId !== req.userId) {
      res.status(404).json({ error: "order not found" });
      return;
    }
    console.debug(
      "receipt",
      JSON.stringify({
        body: req.body,
        email: order.email,
        shippingAddress: order.shippingAddress,
      }),
    );
    queueReceiptEmail(order.email, order.id);
    res.json(buildReceipt(order));
  });

  app.post("/orders/:id/refund", requireSession, async (req: AuthedRequest, res) => {
    const order = getOrder(String(req.params.id));
    if (!order || order.userId !== req.userId) {
      res.status(404).json({ error: "order not found" });
      return;
    }
    console.debug(
      "refund",
      JSON.stringify({
        body: req.body,
        email: order.email,
        shippingAddress: order.shippingAddress,
      }),
    );
    const amountCents = req.body?.amountCents;
    if (typeof amountCents !== "number" || !Number.isFinite(amountCents)) {
      res.status(400).json({ error: "amountCents is required" });
      return;
    }
    try {
      const updated = await applyRefund(order.id, amountCents);
      res.json({
        orderId: updated.id,
        refundedCents: updated.refundedCents,
        feeCents: refundFeeCents(amountCents),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "refund failed";
      if (message === "exceeds order total" || message === "refund window has closed") {
        res.status(400).json({ error: message });
        return;
      }
      res.status(500).json({ error: message });
    }
  });

  app.get("/admin/orders.csv", (_req, res) => {
    const header = "id,email,line1,city,region,postalCode,totalCents";
    const lines = listAllOrders().map((order) =>
      [
        order.id,
        order.email,
        order.shippingAddress.line1,
        order.shippingAddress.city,
        order.shippingAddress.region,
        order.shippingAddress.postalCode,
        order.totalCents,
      ].join(","),
    );
    res.type("text/csv").send([header, ...lines].join("\n"));
  });

  return app;
}
