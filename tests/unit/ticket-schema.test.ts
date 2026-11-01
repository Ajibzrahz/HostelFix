import {
  assignTicketSchema,
  createTicketSchema,
  listTicketsQuerySchema,
  ticketCommentSchema,
  updateStatusSchema,
  updateTicketSchema,
} from "../../src/modules/tickets/ticket-schema";

const id = "6ae3a1f39f4a9f72a8a37c86";

type Result = { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } };
const paths = (r: Result) => r.error?.issues.map((i) => i.path.join(".")) ?? [];
const messages = (r: Result) => r.error?.issues.map((i) => i.message) ?? [];

const validTicket = {
  title: "Leaking tap in room B12",
  description: "The tap has been dripping since Monday.",
  category: "plumbing",
  room: id,
};

describe("createTicketSchema", () => {
  const parse = (body: unknown) => createTicketSchema.safeParse({ body });

  it("accepts a valid ticket and defaults the priority to medium", () => {
    const result = parse(validTicket);

    expect(result.success).toBe(true);
    expect(result.data?.body.priority).toBe("medium");
  });

  it("trims whitespace from the title", () => {
    const result = parse({ ...validTicket, title: "  Leaking tap in room B12  " });

    expect(result.data?.body.title).toBe("Leaking tap in room B12");
  });

  it.each([
    ["a title that is too short", { title: "ab" }, "body.title"],
    ["a description that is too short", { description: "too short" }, "body.description"],
    ["an unknown category", { category: "gardening" }, "body.category"],
    ["an unknown priority", { priority: "whenever" }, "body.priority"],
    ["a malformed room id", { room: "abc" }, "body.room"],
  ])("rejects %s", (_label, change, path) => {
    const result = parse({ ...validTicket, ...change });

    expect(result.success).toBe(false);
    expect(paths(result)).toContain(path);
  });

  it("rejects a missing room", () => {
    const { room, ...withoutRoom } = validTicket;

    expect(parse(withoutRoom).success).toBe(false);
  });

  it.each(["reportedBy", "status", "assignedTo", "isRecurring"])(
    "rejects the server-controlled field %s",
    (field) => {
      expect(parse({ ...validTicket, [field]: "anything" }).success).toBe(false);
    },
  );
});

describe("listTicketsQuerySchema", () => {
  const parse = (query: unknown) => listTicketsQuerySchema.safeParse({ query });

  it("applies the defaults", () => {
    const result = parse({});

    expect(result.data?.query).toMatchObject({ page: 1, limit: 10, sort: "-createdAt" });
  });

  it("turns query strings into numbers", () => {
    const result = parse({ page: "2", limit: "5" });

    expect(result.data?.query).toMatchObject({ page: 2, limit: 5 });
  });

  it.each([
    ["page 0", { page: "0" }],
    ["a limit over 50", { limit: "51" }],
    ["a decimal page", { page: "1.5" }],
    ["an unknown status", { status: "done" }],
    ["a malformed room id", { room: "abc" }],
    ["an unknown sort value", { sort: "title" }],
    ["an unknown parameter", { colour: "red" }],
  ])("rejects %s", (_label, query) => {
    expect(parse(query).success).toBe(false);
  });

  it("accepts every filter at once", () => {
    const result = parse({ status: "open", priority: "high", category: "plumbing", room: id, sort: "createdAt" });

    expect(result.success).toBe(true);
  });
});

describe("updateTicketSchema", () => {
  const parse = (body: unknown, ticketId: string = id) =>
    updateTicketSchema.safeParse({ params: { id: ticketId }, body });

  it("accepts a single changed field", () => {
    expect(parse({ priority: "high" }).success).toBe(true);
  });

  it("rejects an empty body", () => {
    const result = parse({});

    expect(result.success).toBe(false);
    expect(messages(result)).toContain("Provide at least one field to update");
  });

  it.each(["status", "room", "reportedBy", "assignedTo"])("rejects changing %s here", (field) => {
    expect(parse({ [field]: "anything" }).success).toBe(false);
  });

  it("rejects a malformed ticket id", () => {
    expect(parse({ priority: "high" }, "abc").success).toBe(false);
  });
});

describe("ticketCommentSchema", () => {
  const parse = (body: unknown) => ticketCommentSchema.safeParse({ params: { id }, body });

  it("accepts a normal comment", () => {
    expect(parse({ body: "The plumber came but the leak is still there." }).success).toBe(true);
  });

  it("rejects an empty comment and one over 500 characters", () => {
    expect(parse({ body: "" }).success).toBe(false);
    expect(parse({ body: "x".repeat(501) }).success).toBe(false);
  });

  it("rejects extra fields", () => {
    expect(parse({ body: "Hello there", author: id }).success).toBe(false);
  });
});

describe("assignTicketSchema", () => {
  const parse = (body: unknown) => assignTicketSchema.safeParse({ params: { id }, body });

  it("accepts a user id", () => {
    expect(parse({ assignedTo: id }).success).toBe(true);
  });

  it("rejects a malformed user id, a missing field and the old field name", () => {
    expect(parse({ assignedTo: "abc" }).success).toBe(false);
    expect(parse({}).success).toBe(false);
    expect(parse({ assignTo: id }).success).toBe(false);
  });
});

describe("updateStatusSchema", () => {
  const parse = (body: unknown) => updateStatusSchema.safeParse({ params: { id }, body });

  it("accepts a real status", () => {
    expect(parse({ status: "in_progress" }).success).toBe(true);
  });

  it("rejects an unknown status and a client-supplied from", () => {
    expect(parse({ status: "done" }).success).toBe(false);
    expect(parse({ status: "resolved", from: "in_progress" }).success).toBe(false);
  });
});