import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { createSession } from "../src/session.js";

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

describe("POST /session/refresh", () => {
  const items = [{ sku: "mug", unitPriceCents: 1200, quantity: 1 }];
  const ttlSeconds = loadConfig().sessionTtlSeconds;

  it("returns a new session in the body, the same shape as login", async () => {
    const app = createApp();
    // Issued ten minutes ago, so a refresh has to move the expiry forward.
    const first = createSession("u_123", ttlSeconds, Date.now() - 10 * 60 * 1000);
    const before = Date.now();
    const res = await request(app).post("/session/refresh").set("authorization", `Bearer ${first.token}`);
    const after = Date.now();
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(["expiresAt", "token"]);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.token).not.toBe(first.token);
    expect(res.body.expiresAt).toBeGreaterThanOrEqual(before + ttlSeconds * 1000);
    expect(res.body.expiresAt).toBeLessThanOrEqual(after + ttlSeconds * 1000);
    expect(res.headers["set-cookie"]).toBeUndefined();

    const checkout = await request(app).post("/checkout").set("authorization", `Bearer ${res.body.token}`).send({ items });
    expect(checkout.status).toBe(200);
  });

  it("revokes the token it replaces", async () => {
    const app = createApp();
    const login = await request(app).post("/login").send({ userId: "u_123" });
    expect(login.status).toBe(201);
    const res = await request(app).post("/session/refresh").set("authorization", `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);

    const checkout = await request(app).post("/checkout").set("authorization", `Bearer ${login.body.token}`).send({ items });
    expect(checkout.status).toBe(401);
    const again = await request(app).post("/session/refresh").set("authorization", `Bearer ${login.body.token}`);
    expect(again.status).toBe(401);
    expect(again.body).toEqual({ error: "a valid session is required" });
  });

  it("requires a bearer token", async () => {
    const app = createApp();
    const missing = await request(app).post("/session/refresh");
    expect(missing.status).toBe(401);
    expect(missing.body).toEqual({ error: "a valid session is required" });
    const basic = await request(app).post("/session/refresh").set("authorization", "Basic dTpw");
    expect(basic.status).toBe(401);
    expect(basic.body).toEqual({ error: "a valid session is required" });
  });

  it("rejects an unknown token", async () => {
    const app = createApp();
    const res = await request(app).post("/session/refresh").set("authorization", "Bearer not-a-session");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "a valid session is required" });
  });

  it("rejects an expired session", async () => {
    const app = createApp();
    // Issued one TTL ago, so it expires the moment it is created.
    const expired = createSession("u_123", ttlSeconds, Date.now() - ttlSeconds * 1000);
    const res = await request(app).post("/session/refresh").set("authorization", `Bearer ${expired.token}`);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "a valid session is required" });
  });
});
