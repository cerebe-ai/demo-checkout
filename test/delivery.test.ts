import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { clearOrders } from "../src/delivery.js";

describe("receipt delivery", () => {
  beforeEach(() => {
    clearOrders();
  });

  it("requires a session to fetch a receipt", async () => {
    const app = createApp();
    const res = await request(app).get("/orders/missing/receipt");
    expect(res.status).toBe(401);
  });

  it("returns a receipt for a checkout", async () => {
    const { app, token, checkout } = await checkoutAs("ada@example.com");
    expect(checkout.status).toBe(200);
    expect(checkout.body.totalCents).toBe(1299);
    const receipt = await request(app)
      .get(`/orders/${checkout.body.orderId}/receipt`)
      .set("authorization", `Bearer ${token}`);
    expect(receipt.status).toBe(200);
    expect(receipt.body.email).toBe("ada@example.com");
    expect(receipt.body.totalCents).toBe(1299);
    expect(receipt.body.status).toBe("paid");
  });

  it("lists the signed-in customer's orders", async () => {
    const { app, token } = await checkoutAs("ada@example.com");
    const res = await request(app).get("/orders").set("authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(1);
  });

  it("refunds part of an order", async () => {
    const { app, token, checkout } = await checkoutAs("ada@example.com");
    const res = await request(app)
      .post(`/orders/${checkout.body.orderId}/refund`)
      .set("authorization", `Bearer ${token}`)
      .send({ amountCents: 500 });
    expect(res.status).toBe(200);
    expect(res.body.refundedCents).toBe(500);
  });

  it("rejects an unknown order", async () => {
    const app = createApp();
    const login = await request(app).post("/login").send({ userId: "u_123" });
    const res = await request(app)
      .post("/orders/missing/refund")
      .set("authorization", `Bearer ${login.body.token}`)
      .send({ amountCents: 100 });
    expect(res.status).toBe(404);
  });

  it("rejects a refund without an amount", async () => {
    const { app, token, checkout } = await checkoutAs("ada@example.com");
    const res = await request(app)
      .post(`/orders/${checkout.body.orderId}/refund`)
      .set("authorization", `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("includes the customer email", async () => {
    const { app, token, checkout } = await checkoutAs("ada@example.com");
    const receipt = await request(app)
      .get(`/orders/${checkout.body.orderId}/receipt`)
      .set("authorization", `Bearer ${token}`);
    expect(receipt.body.email).toBeDefined();
  });

  it("exports orders for the dashboard", async () => {
    const app = createApp();
    const res = await request(app).get("/admin/orders.csv");
    expect(res.status).toBe(200);
  });
});

async function checkoutAs(email: string) {
  const app = createApp();
  const login = await request(app).post("/login").send({ userId: "u_123" });
  const checkout = await request(app)
    .post("/checkout")
    .set("authorization", `Bearer ${login.body.token}`)
    .send({
      email,
      shippingAddress: { line1: "1 Main St", city: "Austin", region: "TX", postalCode: "78701" },
      items: [{ sku: "mug", unitPriceCents: 1200, quantity: 1 }],
    });
  return { app, token: login.body.token as string, checkout };
}
