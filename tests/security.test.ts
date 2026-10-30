import express from "express";
import request from "supertest";
import app from "../src/app";
import errorHandler from "../src/middleware/errorHandler";
import { createRateLimiter } from "../src/middleware/rate-limit";

describe("security headers", () => {
  it("sets standard security headers and hides the framework", async () => {
    const res = await request(app).get("/health");

    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});

describe("CORS", () => {
  it("allows the configured front-end origin, with credentials", async () => {
    const res = await request(app)
      .get("/health")
      .set("Origin", "http://localhost:3000");

    expect(res.headers["access-control-allow-origin"]).toBe(
      "http://localhost:3000",
    );
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("does not allow any other origin", async () => {
    const res = await request(app)
      .get("/health")
      .set("Origin", "http://evil.example");

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("request body limits", () => {
  it("returns 400 INVALID_JSON for malformed JSON", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .set("Content-Type", "application/json")
      .send("{ this is not json");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_JSON");
  });

  it("returns 413 PAYLOAD_TOO_LARGE for a body over the limit", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "a@test.com", password: "x".repeat(20000) });

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });
});

describe("rate limiting", () => {
  // a small app with a low limit, because the real limiters are switched off in tests
  const miniApp = (options: Parameters<typeof createRateLimiter>[0]) => {
    const mini = express();
    mini.use(createRateLimiter(options));
    mini.get("/ok", (_req, res) => res.send("ok"));
    mini.get("/fail", (_req, res) => res.status(401).send("no"));
    mini.use(errorHandler);
    return mini;
  };

  it("returns 429 RATE_LIMITED in the standard error format once the limit is passed", async () => {
    const mini = miniApp({ windowMs: 60000, limit: 2 });

    const first = await request(mini).get("/ok");
    const second = await request(mini).get("/ok");
    const third = await request(mini).get("/ok");

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
    expect(third.body.error.code).toBe("RATE_LIMITED");
  });

  it("counts only failed requests when skipSuccessfulRequests is on", async () => {
    const mini = miniApp({
      windowMs: 60000,
      limit: 2,
      skipSuccessfulRequests: true,
    });

    for (let i = 0; i < 5; i++) {
      expect((await request(mini).get("/ok")).status).toBe(200);
    }
    expect((await request(mini).get("/fail")).status).toBe(401);
    expect((await request(mini).get("/fail")).status).toBe(401);
    const blocked = await request(mini).get("/fail");

    expect(blocked.status).toBe(429);
  });
});
