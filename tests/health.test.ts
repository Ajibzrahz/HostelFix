import request from "supertest";
import app from "../src/app";

describe("GET /health", () => {
  it("returns 200 and a status payload", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok", uptime: expect.any(Number) });
  });
});

describe("unknown routes", () => {
  it("return 404 in the standard error format", async () => {
    const response = await request(app).get("/api/v1/nothing");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});
