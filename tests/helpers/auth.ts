import request from "supertest";
import app from "../../src/app";
import User, { type UserRole } from "../../src/modules/users/user-model";

export const PASSWORD = "Test-password-123";
let counter = 0;

export async function createUser(
  role: UserRole = "student",
  options: { isEmailVerified?: boolean } = {},
) {
  counter += 1;
  const isEmailVerified = options.isEmailVerified ?? true;
  return User.create({
    name: `${role} ${counter}`,
    email: `${role}${counter}@test.com`,
    passwordHash: PASSWORD, // hashed by the model's save hook
    role,
    isEmailVerified,
    emailVerifiedAt: isEmailVerified ? new Date() : null,
  });
}

export async function loginAs(role: UserRole = "student") {
  const user = await createUser(role);
  const agent = request.agent(app);
  const res = await agent
    .post("/api/v1/auth/login")
    .set("User-Agent", "HostelFix-Test")
    .send({ email: user.email, password: PASSWORD });
  if (res.status !== 200) {
    throw new Error(
      `Test login failed with ${res.status}: ${JSON.stringify(res.body)}`,
    );
  }
  return { agent, user };
}
