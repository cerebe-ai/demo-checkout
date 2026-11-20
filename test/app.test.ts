import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

describe("checkout API", () => {
  it("requires a session for checkout", async () => {
    const app = createApp();
    const res = await request(app).post("/checkout").send({ items: [{ sku: "mug", unitPriceCents: 1200, quantity: 1 }] });
    expect(res.status).toBe(401);
  });

  it("logs in and checks out", async () => {
    const app = createApp();
    const login = await request(app).post("/login").send({ userId: "u_123" });
    expect(login.status).toBe(201);
    const res = await request(app)
      .post("/checkout")
      .set("authorization", `Bearer ${login.body.token}`)
      .send({ items: [{ sku: "mug", unitPriceCents: 1200, quantity: 1 }] });
    expect(res.status).toBe(200);
    expect(res.body.shippingMethod).toBe("standard");
    expect(res.body.shippingCents).toBe(599);
    expect(res.body.taxCents).toBe(99);
    expect(res.body.totalCents).toBe(1898);
  });

  it("charges express shipping when asked", async () => {
    const app = createApp();
    const login = await request(app).post("/login").send({ userId: "u_123" });
    const res = await request(app)
      .post("/checkout")
      .set("authorization", `Bearer ${login.body.token}`)
      .send({ items: [{ sku: "mug", unitPriceCents: 1200, quantity: 1 }], shippingMethod: "express" });
    expect(res.status).toBe(200);
    expect(res.body.shippingMethod).toBe("express");
    expect(res.body.shippingCents).toBe(1499);
    expect(res.body.taxCents).toBe(99);
    expect(res.body.totalCents).toBe(2798);
  });

  it("rejects an unknown shipping method", async () => {
    const app = createApp();
    const login = await request(app).post("/login").send({ userId: "u_123" });
    const res = await request(app)
      .post("/checkout")
      .set("authorization", `Bearer ${login.body.token}`)
      .send({ items: [{ sku: "mug", unitPriceCents: 1200, quantity: 1 }], shippingMethod: "overnight" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "unknown shipping method" });
  });

  it("rejects a non-string shipping method", async () => {
    const app = createApp();
    const login = await request(app).post("/login").send({ userId: "u_123" });
    const res = await request(app)
      .post("/checkout")
      .set("authorization", `Bearer ${login.body.token}`)
      .send({ items: [{ sku: "mug", unitPriceCents: 1200, quantity: 1 }], shippingMethod: 1 });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "shippingMethod must be a string" });
  });
});
