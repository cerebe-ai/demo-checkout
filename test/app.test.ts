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
  });
});
