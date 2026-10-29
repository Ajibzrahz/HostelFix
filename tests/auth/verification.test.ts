import request from "supertest";
import app from "../../src/app";
import User from "../../src/modules/users/user-model";
import { sendEmail } from "../../src/common/service/email-service";

const body = {
  name: "Ada Student",
  email: "ada@test.com",
  password: "Strong-password-1",
  passwordConfirmation: "Strong-password-1",
};

const register = () => request(app).post("/api/v1/auth/register").send(body);
const resend = (email: string) =>
  request(app).post("/api/v1/auth/resend-verification").send({ email });

// the plain-text email body contains the verification link, so read it from the mocked sender
const lastLink = () => {
  const calls = jest.mocked(sendEmail).mock.calls;
  const text = calls[calls.length - 1][0].text ?? "";
  const url = new URL(text.match(/https?:\/\/\S+/)![0]);
  return url.pathname + url.search;
};

describe("email verification", () => {
  it("verifies the account with the emailed link and clears the token", async () => {
    await register();

    const res = await request(app).get(lastLink());

    expect(res.status).toBe(200);
    const user = await User.findOne({ email: body.email }).select(
      "+emailVerificationTokenHash +emailVerificationTokenExpiresAt",
    );
    expect(user?.isEmailVerified).toBe(true);
    expect(user?.emailVerifiedAt).not.toBeNull();
    expect(user?.emailVerificationTokenHash).toBeNull();
    expect(user?.emailVerificationTokenExpiresAt).toBeNull();
  });

  it("lets the user log in after verifying", async () => {
    await register();
    await request(app).get(lastLink());

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: body.email, password: body.password });

    expect(res.status).toBe(200);
  });

  it("returns 400 INVALID_VERIFICATION_LINK for a wrong token", async () => {
    await register();

    const res = await request(app).get(
      `/api/v1/auth/verify-email?email=${encodeURIComponent(body.email)}&token=wrong`,
    );

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_VERIFICATION_LINK");
  });

  it("returns the same error for an unknown email", async () => {
    const res = await request(app).get(
      "/api/v1/auth/verify-email?email=nobody%40test.com&token=whatever",
    );

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_VERIFICATION_LINK");
  });

  it("returns 400 for an expired link", async () => {
    await register();
    const link = lastLink();
    await User.updateOne(
      { email: body.email },
      { emailVerificationTokenExpiresAt: new Date(Date.now() - 1000) },
    );

    const res = await request(app).get(link);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_VERIFICATION_LINK");
  });
});

describe("resending the verification email", () => {
  it("sends a new link and the old link stops working", async () => {
    await register();
    const oldLink = lastLink();

    const res = await resend(body.email);
    const newLink = lastLink();

    expect(res.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect((await request(app).get(oldLink)).status).toBe(400);
    expect((await request(app).get(newLink)).status).toBe(200);
  });

  it("gives the same answer for an unknown email and sends nothing", async () => {
    await register();
    const known = await resend(body.email);
    jest.mocked(sendEmail).mockClear();

    const unknown = await resend("nobody@test.com");

    expect(unknown.status).toBe(200);
    expect(unknown.body.message).toBe(known.body.message);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("sends nothing for an account that is already verified", async () => {
    await register();
    await request(app).get(lastLink());
    jest.mocked(sendEmail).mockClear();

    const res = await resend(body.email);

    expect(res.status).toBe(200);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid email address", async () => {
    const res = await resend("not-an-email");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("when the email provider fails", () => {
  it("still creates the account and says the email could not be sent", async () => {
    jest.mocked(sendEmail).mockRejectedValueOnce(new Error("provider down"));

    const res = await register();

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/could not send/i);
    expect(await User.countDocuments({ email: body.email })).toBe(1);
  });
});