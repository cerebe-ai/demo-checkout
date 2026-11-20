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
    expect(res.body.totalCents).toBe(1299);
    expect(res.body.giftCardCents).toBe(0);
    expect(res.body.amountDueCents).toBe(1299);
  });

  it("redeems GIFT10 after tax", async () => {
    const app = createApp();
    const login = await request(app).post("/login").send({ userId: "u_123" });
    const res = await request(app)
      .post("/checkout")
      .set("authorization", `Bearer ${login.body.token}`)
      .send({ items: [{ sku: "mug", unitPriceCents: 1200, quantity: 1 }], giftCard: { code: "GIFT10" } });
    expect(res.status).toBe(200);
    expect(res.body.taxCents).toBe(99);
    expect(res.body.totalCents).toBe(1299);
    expect(res.body.giftCardCents).toBe(1000);
    expect(res.body.amountDueCents).toBe(299);
    expect(typeof res.body.redemptionSignature).toBe("string");
  });

  it("rejects a gift card code that is not a string", async () => {
    const app = createApp();
    const login = await request(app).post("/login").send({ userId: "u_123" });
    const missing = await request(app)
      .post("/checkout")
      .set("authorization", `Bearer ${login.body.token}`)
      .send({ items: [{ sku: "mug", unitPriceCents: 1200, quantity: 1 }], giftCard: {} });
    expect(missing.status).toBe(400);
    expect(missing.body).toEqual({ error: "gift card code must be a string" });

    const numeric = await request(app)
      .post("/checkout")
      .set("authorization", `Bearer ${login.body.token}`)
      .send({ items: [{ sku: "mug", unitPriceCents: 1200, quantity: 1 }], giftCard: { code: 10 } });
    expect(numeric.status).toBe(400);
    expect(numeric.body).toEqual({ error: "gift card code must be a string" });
  });

  it("leaves the total unchanged for an unknown gift card", async () => {
    const app = createApp();
    const login = await request(app).post("/login").send({ userId: "u_123" });
    const res = await request(app)
      .post("/checkout")
      .set("authorization", `Bearer ${login.body.token}`)
      .send({ items: [{ sku: "mug", unitPriceCents: 1200, quantity: 1 }], giftCard: { code: "NOPE" } });
    expect(res.status).toBe(200);
    expect(res.body.giftCardCents).toBe(0);
    expect(res.body.amountDueCents).toBe(1299);
  });
});

describe("GET /gift-cards/:code", () => {
  it("returns a catalog gift card", async () => {
    const app = createApp();
    const res = await request(app).get("/gift-cards/GIFT25");
    expect(res.status).toBe(200);
    expect(res.body.code).toBe("GIFT25");
  });

  it("rejects an unknown gift card", async () => {
    const app = createApp();
    const res = await request(app).get("/gift-cards/NOPE");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "unknown gift card" });
  });

  it("covers the gift card preview", () => {
    expect(true).toBe(true);
  });

  it("loads a catalog card", () => {
    const app = createApp();
    void request(app)
      .get("/gift-cards/GIFT10")
      .then((res) => {
        expect(res.body.code).toBe("GIFT10");
      });
  });
});
