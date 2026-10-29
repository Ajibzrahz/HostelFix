import mongoose from "mongoose";
import request from "supertest";
import app from "../../src/app";
import { loginAs } from "../helpers/auth";
import { createRoom, createTicket } from "../helpers/factories";

const ticketBody = (room: string) => ({
  title: "Leaking tap in the room",
  description: "The tap has been dripping since Monday.",
  category: "plumbing",
  room,
});

describe("POST /api/v1/tickets", () => {
  it("creates a ticket for the logged-in student", async () => {
    const { agent, user } = await loginAs("student");
    const room = await createRoom();

    const res = await agent.post("/api/v1/tickets").send(ticketBody(room.id));

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      status: "open",
      priority: "medium",
      isRecurring: false,
      reportedBy: user.id,
      room: room.id,
    });
    expect(res.body.statusHistory).toHaveLength(1);
    expect(res.body.statusHistory[0]).toMatchObject({
      from: null,
      to: "open",
      changedBy: user.id,
    });
  });

  it("returns 401 when not logged in", async () => {
    const room = await createRoom();

    const res = await request(app)
      .post("/api/v1/tickets")
      .send(ticketBody(room.id));

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it.each(["reportedBy", "status", "isRecurring", "assignedTo"])(
    "rejects the server-controlled field %s",
    async (field) => {
      const { agent } = await loginAs("student");
      const room = await createRoom();

      const res = await agent
        .post("/api/v1/tickets")
        .send({ ...ticketBody(room.id), [field]: "anything" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    },
  );

  it("returns 400 when the room is missing", async () => {
    const { agent } = await loginAs("student");
    const { room, ...withoutRoom } = ticketBody("unused");

    const res = await agent.post("/api/v1/tickets").send(withoutRoom);

    expect(res.status).toBe(400);
  });

  it("returns 404 ROOM_NOT_FOUND for a room that does not exist", async () => {
    const { agent } = await loginAs("student");
    const missing = new mongoose.Types.ObjectId().toString();

    const res = await agent.post("/api/v1/tickets").send(ticketBody(missing));

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("ROOM_NOT_FOUND");
  });

  it("returns 409 DUPLICATE_TICKET when an unresolved ticket exists for the same room and category", async () => {
    const { agent } = await loginAs("student");
    const { user: ticketOwner } = await loginAs("student");
    const room = await createRoom();
    await createTicket({
      reportedBy: ticketOwner._id,
      room: room._id,
      status: "assigned",
    });

    const res = await agent.post("/api/v1/tickets").send(ticketBody(room.id));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("DUPLICATE_TICKET");
  });

  it("allows a new report once the earlier ticket is resolved, and flags it as recurring", async () => {
    const { agent } = await loginAs("student");
    const { user: ticketOwner } = await loginAs("student");
    const room = await createRoom();
    await createTicket({
      reportedBy: ticketOwner._id,
      room: room._id,
      status: "resolved",
    });

    const res = await agent.post("/api/v1/tickets").send(ticketBody(room.id));

    expect(res.status).toBe(201);
    expect(res.body.isRecurring).toBe(true);
  });
});

describe("ticket ownership", () => {
  it("returns 401 when not logged in", async () => {
    const res = await request(app).get("/api/v1/tickets");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 403 when a student opens another student's ticket", async () => {
    const { agent: userAgent } = await loginAs("student");
    const { user: ticketOwner } = await loginAs("student");
    const ticket = await createTicket({ reportedBy: ticketOwner._id });

    const res = await userAgent.get(`/api/v1/tickets/${ticket.id}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("allows a student to update their own ticket", async () => {
    const { agent, user: ticketOwner } = await loginAs("student");
    const ticket = await createTicket({ reportedBy: ticketOwner._id });

    const res = await agent
      .patch(`/api/v1/tickets/${ticket.id}`)
      .send({ description: "The tap has been dripping since Tuesday." });

    expect(res.status).toBe(200);
  });

  it("returns 403 when a student updates another student's ticket", async () => {
    const { agent: userAgent } = await loginAs("student");
    const { user: ada } = await loginAs("student");

    const ticket = await createTicket({ reportedBy: ada._id });

    const res = await userAgent
      .patch(`/api/v1/tickets/${ticket.id}`)
      .send({ description: "The tap has been dripping since Tuesday." });

    expect(res.status).toBe(403);
  });

  it("returns 409 when a student updates an assigned ticket", async () => {
    const { agent, user: ticketOwner } = await loginAs("student");
    const ticket = await createTicket({
      reportedBy: ticketOwner._id,
      status: "assigned",
    });

    const res = await agent
      .patch(`/api/v1/tickets/${ticket.id}`)
      .send({ description: "The tap has been dripping since Tuesday." });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("TICKET_LOCKED");
  });

  it("returns 400 when a student tries to set the ticket status", async () => {
    const { agent, user: ticketOwner } = await loginAs("student");
    const ticket = await createTicket({
      reportedBy: ticketOwner._id,
      status: "assigned",
    });

    const res = await agent
      .patch(`/api/v1/tickets/${ticket.id}`)
      .send({ status: "resolved" });

    expect(res.status).toBe(400);
  });

  it("lets staff open any ticket", async () => {
    const { user: ticketOwner } = await loginAs("student");
    const { agent: staff } = await loginAs("staff");
    const ticket = await createTicket({ reportedBy: ticketOwner._id });

    const res = await staff.get(`/api/v1/tickets/${ticket.id}`);

    expect(res.status).toBe(200);
  });

  it.each(["student", "staff"] as const)(
    "returns 403 when a %s delete a ticket",
    async (role) => {
      const { agent, user: ticketOwner } = await loginAs(role);
      const ticket = await createTicket({
        reportedBy: ticketOwner._id,
        status: "assigned",
      });

      const res = await agent.delete(`/api/v1/tickets/${ticket.id}`);

      expect(res.status).toBe(403);
    },
  );

  it("allows an admin to delete a ticket", async () => {
    const { user: ticketOwner } = await loginAs("student");
    const { agent } = await loginAs("admin");
    const ticket = await createTicket({
      reportedBy: ticketOwner._id,
      status: "assigned",
    });

    const res = await agent.delete(`/api/v1/tickets/${ticket.id}`);
    const getTicket = await agent.get(`/api/v1/tickets/${ticket.id}`);

    expect(res.status).toBe(204);
    expect(getTicket.status).toBe(404);
  });
});
