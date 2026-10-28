import request from "supertest";
import app from "../../src/app";
import { createUser, PASSWORD } from "../helpers/auth";
import { sendEmail } from "../../src/common/service/email-service";
import User from "../../src/modules/users/user-model";

const validBody = {
  name: "Ada Student",
  email: "ada@test.com",
  password: "Strong-password-1",
  passwordConfirmation: "Strong-password-1",
};

//authentication
describe("POST /api/v1/auth/register", () => {
  it("creates a student and returns the user without secrets", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      name: "Ada Student",
      email: "ada@test.com",
      role: "student",
      isEmailVerified: false,
    });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.user.emailVerificationTokenHash).toBeUndefined();
  });
  it("stores a bcrypt hash, never the plain password", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send(validBody);

    const saved = await User.findOne({ email: validBody.email }).select(
      "+passwordHash",
    );

    expect(res.status).toBe(201);
    expect(saved?.passwordHash).not.toBe(validBody.password);
    expect(saved?.passwordHash).toMatch(
      /^\$2[abxy]?\$(?:0[4-9]|[12][0-9]|3[01])\$[./0-9a-zA-Z]{53}$/,
    );
  });
  it("sends one verification email", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send(validBody);

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: validBody.email }),
    );
  });
  it("rejects a role in the body", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ ...validBody, role: "admin" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
  it("rejects short passwords", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ ...validBody, password: "short", passwordConfirmation: "short" });

    expect(res.status).toBe(400);
  });
  it("rejects mismatched password cofirmation", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ ...validBody, passwordConfirmation: "Different-password-1" });

    expect(res.status).toBe(400);
  });
  it("returns 409 when email is already registered", async () => {
    await createUser("student");
    const existing = await User.findOne();

    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ ...validBody, email: existing!.email });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });
});

