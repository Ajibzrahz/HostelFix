import mongoose from "mongoose";
import Room from "../../src/modules/rooms/room-model";
import { loginAs } from "../helpers/auth";
import { createHostel, createTicket } from "../helpers/factories";

const roomBody = { roomNumber: "R101" };

describe("hostels", () => {
  it("lets an admin create a hostel", async () => {
    const { agent } = await loginAs("admin");

    const res = await agent
      .post("/api/v1/hostels")
      .send({ name: "Unity Hall" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Unity Hall");
  });

  it.each(["student", "staff"] as const)(
    "returns 403 when a %s creates a hostel",
    async (role) => {
      const { agent } = await loginAs(role);

      const res = await agent
        .post("/api/v1/hostels")
        .send({ name: "Unity Hall" });

      expect(res.status).toBe(403);
    },
  );

  it("returns 409 for a duplicate hostel name", async () => {
    const { agent } = await loginAs("admin");
    await createHostel("Unity Hall");

    const res = await agent
      .post("/api/v1/hostels")
      .send({ name: "Unity Hall" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("returns 409 HOSTEL_HAS_ROOMS when deleting a hostel that has rooms", async () => {
    const { agent } = await loginAs("admin");
    const hostel = await createHostel();
    await Room.create({ hostel: hostel._id, roomNumber: "R101" });

    const res = await agent.delete(`/api/v1/hostels/${hostel.id}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("HOSTEL_HAS_ROOMS");
  });

  it("returns 204 when deleting an empty hostel", async () => {
    const { agent } = await loginAs("admin");
    const hostel = await createHostel();

    const res = await agent.delete(`/api/v1/hostels/${hostel.id}`);

    expect(res.status).toBe(204);
  });
});

describe("rooms", () => {
  it.each(["admin", "staff"] as const)(
    "lets %s create a room",
    async (role) => {
      const { agent } = await loginAs(role);
      const hostel = await createHostel();

      const res = await agent
        .post(`/api/v1/hostels/${hostel.id}/rooms`)
        .send(roomBody);

      expect(res.status).toBe(201);
      expect(res.body.roomNumber).toBe("R101");
    },
  );

  it("returns 403 when a student creates a room", async () => {
    const { agent } = await loginAs("student");
    const hostel = await createHostel();

    const res = await agent
      .post(`/api/v1/hostels/${hostel.id}/rooms`)
      .send(roomBody);

    expect(res.status).toBe(403);
  });

  it("returns 409 for the same room number in the same hostel", async () => {
    const { agent } = await loginAs("staff");
    const hostel = await createHostel();
    await agent.post(`/api/v1/hostels/${hostel.id}/rooms`).send(roomBody);

    const res = await agent
      .post(`/api/v1/hostels/${hostel.id}/rooms`)
      .send(roomBody);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("allows the same room number in a different hostel", async () => {
    const { agent } = await loginAs("staff");
    const first = await createHostel("Hostel A");
    const second = await createHostel("Hostel B");

    const a = await agent
      .post(`/api/v1/hostels/${first.id}/rooms`)
      .send(roomBody);
    const b = await agent
      .post(`/api/v1/hostels/${second.id}/rooms`)
      .send(roomBody);

    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
  });

  it("returns 404 HOSTEL_NOT_FOUND for a hostel that does not exist", async () => {
    const { agent } = await loginAs("staff");
    const missing = new mongoose.Types.ObjectId().toString();

    const res = await agent
      .post(`/api/v1/hostels/${missing}/rooms`)
      .send(roomBody);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("HOSTEL_NOT_FOUND");
  });

  it("lists only the rooms of the requested hostel", async () => {
    const { agent } = await loginAs("student");
    const first = await createHostel("Hostel A");
    const second = await createHostel("Hostel B");
    await Room.create({ hostel: first._id, roomNumber: "A1" });
    await Room.create({ hostel: second._id, roomNumber: "B1" });

    const res = await agent.get(`/api/v1/hostels/${first.id}/rooms`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].roomNumber).toBe("A1");
  });

  it("returns 409 ROOM_HAS_TICKETS when deleting a room that has tickets", async () => {
    const { agent } = await loginAs("staff");
    const { user: student } = await loginAs("student");
    const hostel = await createHostel();
    const room = await Room.create({ hostel: hostel._id, roomNumber: "R101" });
    await createTicket({ reportedBy: student._id, room: room._id });

    const res = await agent.delete(`/api/v1/rooms/${room.id}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ROOM_HAS_TICKETS");
  });

  it("frees the hostel for deletion once its last room is deleted", async () => {
    const { agent: admin } = await loginAs("admin");
    const hostel = await createHostel();
    const room = await Room.create({ hostel: hostel._id, roomNumber: "R101" });

    const dropRoom = await admin.delete(`/api/v1/rooms/${room.id}`);
    const dropHostel = await admin.delete(`/api/v1/hostels/${hostel.id}`);

    expect(dropRoom.status).toBe(204);
    expect(dropHostel.status).toBe(204);
  });
});
