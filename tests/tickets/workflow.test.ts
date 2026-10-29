import request from "supertest";
import { loginAs } from "../helpers/auth";
import { createTicket } from "../helpers/factories";

type Agent = ReturnType<typeof request.agent>;

const assign = (agent: Agent, id: string, assignedTo: string) =>
  agent.patch(`/api/v1/tickets/${id}/assign`).send({ assignedTo });

const setStatus = (agent: Agent, id: string, status: string) =>
  agent.patch(`/api/v1/tickets/${id}/status`).send({ status });

const comment = (agent: Agent, id: string, body: string) =>
  agent.post(`/api/v1/tickets/${id}/comments`).send({ body });

describe("assigning a ticket", () => {
  it("moves an open ticket to assigned and records it in the history", async () => {
    const { user: student } = await loginAs("student");
    const { agent, user: staff } = await loginAs("staff");
    const ticket = await createTicket({ reportedBy: student._id });

    const res = await assign(agent, ticket.id, staff.id);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("assigned");
    expect(res.body.assignedTo).toBe(staff.id);
    expect(res.body.statusHistory).toHaveLength(2);
    expect(res.body.statusHistory[1]).toMatchObject({
      from: "open",
      to: "assigned",
      changedBy: staff.id,
    });
  });

  it("returns 400 INVALID_ASSIGNEE when the assignee is a student", async () => {
    const { user: student } = await loginAs("student");
    const { agent } = await loginAs("staff");
    const ticket = await createTicket({ reportedBy: student._id });

    const res = await assign(agent, ticket.id, student.id);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_ASSIGNEE");
  });

  it("returns 404 USER_NOT_FOUND for an unknown assignee", async () => {
    const { user: student } = await loginAs("student");
    const { agent } = await loginAs("staff");
    const ticket = await createTicket({ reportedBy: student._id });

    const res = await assign(agent, ticket.id, "000000000000000000000000");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("USER_NOT_FOUND");
  });

  it("returns 403 when a student tries to assign", async () => {
    const { agent, user: student } = await loginAs("student");
    const { user: staff } = await loginAs("staff");
    const ticket = await createTicket({ reportedBy: student._id });

    const res = await assign(agent, ticket.id, staff.id);

    expect(res.status).toBe(403);
  });

  it("returns 409 INVALID_TRANSITION for a resolved ticket", async () => {
    const { user: student } = await loginAs("student");
    const { agent, user: staff } = await loginAs("staff");
    const ticket = await createTicket({
      reportedBy: student._id,
      status: "resolved",
    });

    const res = await assign(agent, ticket.id, staff.id);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INVALID_TRANSITION");
  });
});

describe("changing status", () => {
  it("lets staff move assigned to in_progress and then resolved", async () => {
    const { user: student } = await loginAs("student");
    const { agent, user: staff } = await loginAs("staff");
    const ticket = await createTicket({
      reportedBy: student._id,
      status: "assigned",
      assignedTo: staff._id,
    });

    const started = await setStatus(agent, ticket.id, "in_progress");
    const resolved = await setStatus(agent, ticket.id, "resolved");

    expect(started.status).toBe(200);
    expect(resolved.status).toBe(200);
    expect(resolved.body.status).toBe("resolved");
    expect(resolved.body.resolvedAt).not.toBeNull();
  });

  it("returns 409 INVALID_TRANSITION when a step is skipped", async () => {
    const { user: student } = await loginAs("student");
    const { agent } = await loginAs("staff");
    const ticket = await createTicket({ reportedBy: student._id });

    const res = await setStatus(agent, ticket.id, "resolved");

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INVALID_TRANSITION");
  });

  it("returns 403 when staff try to close a resolved ticket", async () => {
    const { user: student } = await loginAs("student");
    const { agent } = await loginAs("staff");
    const ticket = await createTicket({
      reportedBy: student._id,
      status: "resolved",
    });

    const res = await setStatus(agent, ticket.id, "closed");

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("lets the reporting student confirm the fix", async () => {
    const { agent, user: student } = await loginAs("student");
    const ticket = await createTicket({
      reportedBy: student._id,
      status: "resolved",
    });

    const res = await setStatus(agent, ticket.id, "closed");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("closed");
    expect(res.body.confirmedAt).not.toBeNull();
  });

  it("lets the reporting student reopen a resolved ticket and clears resolvedAt", async () => {
    const { agent: student, user } = await loginAs("student");
    const { agent: staff, user: staffUser } = await loginAs("staff");
    const ticket = await createTicket({
      reportedBy: user._id,
      status: "in_progress",
      assignedTo: staffUser._id,
    });
    await setStatus(staff, ticket.id, "resolved");

    const res = await setStatus(student, ticket.id, "in_progress");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("in_progress");
    expect(res.body.resolvedAt).toBeNull();
  });

  it("returns 403 when a different student tries to confirm", async () => {
    const { user: reporter } = await loginAs("student");
    const { agent: other } = await loginAs("student");
    const ticket = await createTicket({
      reportedBy: reporter._id,
      status: "resolved",
    });

    const res = await setStatus(other, ticket.id, "closed");

    expect(res.status).toBe(403);
  });

  it("returns 409 for any change to a closed ticket", async () => {
    const { user: student } = await loginAs("student");
    const { agent } = await loginAs("staff");
    const ticket = await createTicket({
      reportedBy: student._id,
      status: "closed",
    });

    const res = await setStatus(agent, ticket.id, "in_progress");

    expect(res.status).toBe(409);
  });

  it("records every step of a full lifecycle in the history", async () => {
    const { agent: student, user } = await loginAs("student");
    const { agent: staff, user: staffUser } = await loginAs("staff");
    const ticket = await createTicket({ reportedBy: user._id });

    await assign(staff, ticket.id, staffUser.id);
    await setStatus(staff, ticket.id, "in_progress");
    await setStatus(staff, ticket.id, "resolved");
    const res = await setStatus(student, ticket.id, "closed");

    expect(res.status).toBe(200);
    expect(
      res.body.statusHistory.map((entry: { to: string }) => entry.to),
    ).toEqual(["open", "assigned", "in_progress", "resolved", "closed"]);
  });
});

describe("commenting", () => {
  it("lets the reporter comment", async () => {
    const { agent, user } = await loginAs("student");
    const ticket = await createTicket({ reportedBy: user._id });

    const res = await comment(agent, ticket.id, "The leak is getting worse.");

    expect(res.status).toBe(201);
    expect(res.body.comments).toHaveLength(1);
    expect(res.body.comments[0]).toMatchObject({
      author: user.id,
      body: "The leak is getting worse.",
    });
  });

  it("lets staff comment on any ticket", async () => {
    const { user: student } = await loginAs("student");
    const { agent } = await loginAs("staff");
    const ticket = await createTicket({ reportedBy: student._id });

    const res = await comment(agent, ticket.id, "A plumber is on the way.");

    expect(res.status).toBe(201);
  });

  it("returns 403 when another student comments", async () => {
    const { user: reporter } = await loginAs("student");
    const { agent: other } = await loginAs("student");
    const ticket = await createTicket({ reportedBy: reporter._id });

    const res = await comment(other, ticket.id, "Me too.");

    expect(res.status).toBe(403);
  });

  it("returns 400 for an empty comment", async () => {
    const { agent, user } = await loginAs("student");
    const ticket = await createTicket({ reportedBy: user._id });

    const res = await comment(agent, ticket.id, "");

    expect(res.status).toBe(400);
  });

  it("returns 400 for a comment over 500 characters", async () => {
    const { agent, user } = await loginAs("student");
    const ticket = await createTicket({ reportedBy: user._id });

    const res = await comment(agent, ticket.id, "x".repeat(501));

    expect(res.status).toBe(400);
  });
});
