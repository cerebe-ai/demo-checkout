import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

async function checkout(body: object) {
  const app = createApp();
  const login = await request(app).post("/login").send({ userId: "u_123" });
  return request(app).post("/checkout").set("authorization", `Bearer ${login.body.token}`).send(body);
}

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
    expect(res.body.discountCents).toBe(0);
    expect(res.body.totalCents).toBe(1299);
  });

  it("takes 10% off the subtotal before tax with SAVE10", async () => {
    const res = await checkout({ items: [{ sku: "mug", unitPriceCents: 1200, quantity: 1 }], promoCode: "SAVE10" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ subtotalCents: 1200, discountCents: 120, taxCents: 89, totalCents: 1169 });
  });

  it("rejects an unknown promo code", async () => {
    const res = await checkout({ items: [{ sku: "mug", unitPriceCents: 1200, quantity: 1 }], promoCode: "BOGUS" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "unknown promo code" });
  });

  it("rejects a promo code that is not a string", async () => {
    const res = await checkout({ items: [{ sku: "mug", unitPriceCents: 1200, quantity: 1 }], promoCode: 10 });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "promoCode must be a string" });
  });
});
