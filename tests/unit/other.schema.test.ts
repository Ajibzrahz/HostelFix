import {
  createUserSchema,
  loginSchema,
  resendVerificationSchema,
  verifyEmailSchema,
} from "../../src/modules/users/user-schema";
import {
  createHostelSchema,
  updateHostelSchema,
} from "../../src/modules/hostels/hostel-schema";
import {
  createRoomSchema,
  updateRoomSchema,
} from "../../src/modules/rooms/room-schema";

const id = "6ae3a1f39f4a9f72a8a37c86";

type Result = {
  success: boolean;
  error?: { issues: { path: PropertyKey[] }[] };
};
const paths = (r: Result) => r.error?.issues.map((i) => i.path.join(".")) ?? [];

describe("createUserSchema", () => {
  const valid = {
    name: "Ada Student",
    email: "ada@test.com",
    password: "Strong-password-1",
    passwordConfirmation: "Strong-password-1",
  };
  const parse = (body: unknown) => createUserSchema.safeParse({ body });

  it("accepts valid input and lowercases the email", () => {
    const result = parse({ ...valid, email: "Ada@Test.COM" });

    expect(result.success).toBe(true);
    expect(result.data?.body.email).toBe("ada@test.com");
  });

  it("rejects a confirmation that does not match, pointing at that field", () => {
    const result = parse({
      ...valid,
      passwordConfirmation: "Different-password-1",
    });

    expect(result.success).toBe(false);
    expect(paths(result)).toContain("body.passwordConfirmation");
  });

  it.each([
    ["a short password", { password: "short", passwordConfirmation: "short" }],
    ["an invalid email", { email: "not-an-email" }],
    ["an empty name", { name: "   " }],
  ])("rejects %s", (_label, change) => {
    expect(parse({ ...valid, ...change }).success).toBe(false);
  });

  it("rejects a role, so nobody can choose their own", () => {
    expect(parse({ ...valid, role: "admin" }).success).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(parse({}).success).toBe(false);
  });
});

describe("loginSchema", () => {
  const parse = (body: unknown) => loginSchema.safeParse({ body });

  it("accepts an email and a password", () => {
    expect(parse({ email: "ada@test.com", password: "whatever" }).success).toBe(
      true,
    );
  });

  it("rejects a missing password, a bad email and extra fields", () => {
    expect(parse({ email: "ada@test.com" }).success).toBe(false);
    expect(parse({ email: "nope", password: "whatever" }).success).toBe(false);
    expect(
      parse({ email: "ada@test.com", password: "whatever", role: "admin" })
        .success,
    ).toBe(false);
  });
});

describe("email verification schemas", () => {
  it("accepts a verification link's email and token, lowercasing the email", () => {
    const result = verifyEmailSchema.safeParse({
      query: { email: "Ada@Test.com", token: "abc123" },
    });

    expect(result.success).toBe(true);
    expect(result.data?.query.email).toBe("ada@test.com");
  });

  it("rejects a missing token or a bad email", () => {
    expect(
      verifyEmailSchema.safeParse({ query: { email: "ada@test.com" } }).success,
    ).toBe(false);
    expect(
      verifyEmailSchema.safeParse({ query: { email: "nope", token: "abc" } })
        .success,
    ).toBe(false);
  });

  it("validates the email when resending", () => {
    expect(
      resendVerificationSchema.safeParse({ body: { email: "ada@test.com" } })
        .success,
    ).toBe(true);
    expect(
      resendVerificationSchema.safeParse({ body: { email: "nope" } }).success,
    ).toBe(false);
  });
});

describe("hostel schemas", () => {
  it("accepts a hostel with and without a location, and trims the name", () => {
    const result = createHostelSchema.safeParse({
      body: { name: "  Unity Hall  " },
    });

    expect(result.success).toBe(true);
    expect(result.data?.body.name).toBe("Unity Hall");
    expect(
      createHostelSchema.safeParse({
        body: { name: "Unity Hall", location: "North Campus" },
      }).success,
    ).toBe(true);
  });

  it("rejects a short name, a long location and unknown fields", () => {
    expect(createHostelSchema.safeParse({ body: { name: "A" } }).success).toBe(
      false,
    );
    expect(
      createHostelSchema.safeParse({
        body: { name: "Unity Hall", location: "x".repeat(201) },
      }).success,
    ).toBe(false);
    expect(
      createHostelSchema.safeParse({
        body: { name: "Unity Hall", owner: "me" },
      }).success,
    ).toBe(false);
  });

  it("needs at least one field to update", () => {
    expect(
      updateHostelSchema.safeParse({
        params: { hostelId: id },
        body: {},
      }).success,
    ).toBe(false);

    expect(
      updateHostelSchema.safeParse({
        params: { hostelId: id },
        body: { name: "New Name" },
      }).success,
    ).toBe(true);
  });
});

describe("room schemas", () => {
  it("accepts a room with and without a floor", () => {
    expect(
      createRoomSchema.safeParse({
        params: { hostelId: id },
        body: { roomNumber: "R101" },
      }).success,
    ).toBe(true);
    expect(
      createRoomSchema.safeParse({
        params: { hostelId: id },
        body: { roomNumber: "R101", floor: 2 },
      }).success,
    ).toBe(true);
  });

  it.each([
    ["an empty room number", { roomNumber: "" }],
    ["a room number over 20 characters", { roomNumber: "x".repeat(21) }],
    ["a negative floor", { roomNumber: "R1", floor: -1 }],
    ["a decimal floor", { roomNumber: "R1", floor: 1.5 }],
    ["an unknown field", { roomNumber: "R1", hostel: id }],
  ])("rejects %s", (_label, body) => {
    expect(
      createRoomSchema.safeParse({ params: { hostelId: id }, body }).success,
    ).toBe(false);
  });

  it("rejects a malformed hostel id", () => {
    expect(
      createRoomSchema.safeParse({
        params: { hostelId: "abc" },
        body: { roomNumber: "R1" },
      }).success,
    ).toBe(false);
  });

  it("needs at least one field to update", () => {
    expect(
      updateRoomSchema.safeParse({ params: { roomId: id }, body: {} }).success,
    ).toBe(false);
    expect(
      updateRoomSchema.safeParse({ params: { roomId: id }, body: { floor: 3 } })
        .success,
    ).toBe(true);
  });
});
