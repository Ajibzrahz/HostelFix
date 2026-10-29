import type { Request, Response } from "express";
import mongoose from "mongoose";
import request from "supertest";
import app from "../src/app";
import errorHandler from "../src/middleware/errorHandler";
import { AppError } from "../src/common/utils/app-error";
import { loginAs } from "./helpers/auth";

// calls the handler directly with a fake response, no HTTP involved
const run = (err: unknown, headersSent = false) => {
  const res = {
    headersSent,
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as Response;
  const next = jest.fn();
  errorHandler(err, {} as Request, res, next);
  return { res, next, body: (res.json as jest.Mock).mock.calls[0]?.[0] };
};

describe("error handler", () => {
  it("formats an AppError, including its details", () => {
    const { res, body } = run(
      new AppError(404, "NOT_FOUND", "Ticket not found", [{ field: "id" }]),
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(body).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Ticket not found",
        details: [{ field: "id" }],
      },
    });
  });

  it("turns a Mongoose validation error into 400 VALIDATION_ERROR", () => {
    const err = new mongoose.Error.ValidationError();
    err.errors = {
      name: new mongoose.Error.ValidatorError({
        path: "name",
        message: "Name is required",
      }),
    };

    const { res, body } = run(err);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details).toEqual([
      { field: "name", message: "Name is required" },
    ]);
  });

  it("turns a duplicate key error into 409 CONFLICT", () => {
    const { res, body } = run({
      code: 11000,
      keyValue: { email: "a@test.com" },
    });

    expect(res.status).toHaveBeenCalledWith(409);
    expect(body.error.code).toBe("CONFLICT");
    expect(body.error.message).toContain("email");
  });

  it("turns a bad ObjectId cast into 400 INVALID_ID", () => {
    const { res, body } = run(
      new mongoose.Error.CastError("ObjectId", "abc", "_id"),
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(body.error.code).toBe("INVALID_ID");
  });

  it("hides the details of an unexpected error", () => {
    const { res, body } = run(new Error("database password is hunter2"));

    expect(res.status).toHaveBeenCalledWith(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(body)).not.toContain("hunter2");
  });

  it("passes the error on when the response was already sent", () => {
    const err = new Error("late error");

    const { res, next } = run(err, true);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
  });
});

const cookieFrom = (res: request.Response, name: string) => {
  const cookies = (res.headers["set-cookie"] ?? []) as unknown as string[];
  return cookies.find((c) => c.startsWith(`${name}=`))?.split(";")[0];
};

describe("invalid tokens", () => {
  it("returns 401 for garbage access and refresh cookies", async () => {
    const res = await request(app)
      .get("/api/v1/tickets")
      .set("Cookie", ["accessToken=garbage", "refreshToken=garbage"]);

    expect(res.status).toBe(401);
  });

  it("returns 401 when the refresh token belongs to a logged-out session", async () => {
    const { user } = await loginAs("student");
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: user.email, password: "Test-password-123" });
    const refresh = cookieFrom(login, "refreshToken")!;
    await request(app)
      .delete("/api/v1/auth/logout")
      .set("Cookie", cookieFrom(login, "accessToken")!);

    const res = await request(app)
      .get("/api/v1/tickets")
      .set("Cookie", refresh);

    expect(res.status).toBe(401);
  });
});
