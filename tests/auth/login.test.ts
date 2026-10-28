import request from "supertest";
import app from "../../src/app";
import { PASSWORD, createUser, loginAs } from "../helpers/auth";

const cookieFrom = (res: request.Response, name: string) => {
  const cookies = (res.headers["set-cookie"] ?? []) as unknown as string[];
  return cookies.find((c) => c.startsWith(`${name}=`))?.split(";")[0];
};

describe("POST /api/v1/auth/login", () => {
  it("logs in, sets both cookies and return no secret", async () => {
    const user = await createUser("student");

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: user.email, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(cookieFrom(res, "accessToken")).toBeDefined();
    expect(cookieFrom(res, "refreshToken")).toBeDefined();
    // expect(res.headers["set-cookie"].join(";")).toContain("HttpOnly");
    expect(res.body.user).toEqual({
      id: user.id,
      name: user.name,
      email: user.email,
      role: "student",
    });
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
  });
  it("return a 401 for a wrong password", async () => {
    const user = await createUser("student");

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: user.email, password: "my-password" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
  it("return a 401 for an unknown email", async () => {
    const user = await createUser("student");

    const wrongPassword = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: user.email, password: "wrong-password" });

    const unknownEmail = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "ajibz@gmail.com", password: PASSWORD });

    expect(unknownEmail.status).toBe(401);
    expect(unknownEmail.body.error.message).toBe(
      wrongPassword.body.error.message,
    );
  });
  it("return a 403 EMAIL_NOT_VERIFIED for an unverified user", async () => {
    const user = await createUser("student", { isEmailVerified: false });

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: user.email, password: PASSWORD });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("EMAIL_NOT_VERIFIED");
  });
  it("does not return that an account is not verified if password is wrong", async () => {
    const user = await createUser("student", { isEmailVerified: false });

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: user.email, password: "my-password" });

    expect(res.status).toBe(401);
  });
  it("returns a 400 for a missing password", async () => {
    const user = await createUser("student");

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: user.email });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
  it("renews the access token from the refresh cookie", async () => {
    const user = await createUser("student");
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: user.email, password: PASSWORD });

    const res = await request(app)
      .get("/api/v1/tickets")
      .set("Cookie", cookieFrom(login, "refreshToken")!);

    expect(res.status).toBe(200);
    expect(cookieFrom(res, "accessToken")).toBeDefined();
  });
  it("returns 401 after logout", async () => {
    const { agent } = await loginAs("student");

    const logout = await agent.delete("/api/v1/auth/logout");
    expect(logout.status).toBe(200);

    const res = await agent.get("/api/v1/tickets");
    expect(res.status).toBe(401);
  });
  it("rejects an old access token after logout", async () => {
    const user = await createUser("student");
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: user.email, password: PASSWORD });
    const accessCookie = cookieFrom(login, "accessToken")!;

    await request(app)
      .delete("/api/v1/auth/logout")
      .set("Cookie", accessCookie);

    const res = await request(app)
      .get("/api/v1/tickets")
      .set("Cookie", accessCookie);
    expect(res.status).toBe(401);
  });
  it("returns 401 when logging out twice", async () => {
    const { agent } = await loginAs("student");

    await agent.delete("/api/v1/auth/logout");
    const second = await agent.delete("/api/v1/auth/logout");

    expect(second.status).toBe(401);
  });

  it("returns 401 when logging out without being logged in", async () => {
    const res = await request(app).delete("/api/v1/auth/logout");

    expect(res.status).toBe(401);
  });
});
