import mongoose from "mongoose";
import Hostel from "../../src/modules/hostels/hostel-model";
import Room from "../../src/modules/rooms/room-model";
import { loginAs } from "../helpers/auth";
import { createHostel } from "../helpers/factories";

const missingId = () => new mongoose.Types.ObjectId().toString();

describe("reading hostels", () => {
  it("lists hostels with pagination, sorted by name", async () => {
    const { agent } = await loginAs("student");
    await createHostel("Hostel C");
    await createHostel("Hostel A");
    await createHostel("Hostel B");

    const first = await agent.get("/api/v1/hostels?limit=2");
    const second = await agent.get("/api/v1/hostels?limit=2&page=2");

    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2,
    });
    expect(first.body.data.map((h: { name: string }) => h.name)).toEqual([
      "Hostel A",
      "Hostel B",
    ]);
    expect(second.body.data).toHaveLength(1);
  });

  it("returns 400 for an invalid limit", async () => {
    const { agent } = await loginAs("student");

    const res = await agent.get("/api/v1/hostels?limit=100");

    expect(res.status).toBe(400);
  });

  it("gets one hostel", async () => {
    const { agent } = await loginAs("student");
    const hostel = await createHostel("Unity Hall");

    const res = await agent.get(`/api/v1/hostels/${hostel.id}`);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Unity Hall");
  });

  it("returns 404 for an unknown hostel and 400 for a malformed id", async () => {
    const { agent } = await loginAs("student");

    const unknown = await agent.get(`/api/v1/hostels/${missingId()}`);
    const malformed = await agent.get("/api/v1/hostels/abc");

    expect(unknown.status).toBe(404);
    expect(unknown.body.error.code).toBe("NOT_FOUND");
    expect(malformed.status).toBe(400);
  });
});

describe("updating hostels", () => {
  it("lets an admin rename a hostel", async () => {
    const { agent } = await loginAs("admin");
    const hostel = await createHostel("Old Name");

    const res = await agent
      .patch(`/api/v1/hostels/${hostel.id}`)
      .send({ name: "New Name" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("New Name");
  });

  it("returns 403 for a student", async () => {
    const { agent } = await loginAs("student");
    const hostel = await createHostel();

    const res = await agent
      .patch(`/api/v1/hostels/${hostel.id}`)
      .send({ name: "New Name" });

    expect(res.status).toBe(403);
  });

  it("returns 400 for an empty body", async () => {
    const { agent } = await loginAs("admin");
    const hostel = await createHostel();

    const res = await agent.patch(`/api/v1/hostels/${hostel.id}`).send({});

    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown hostel", async () => {
    const { agent } = await loginAs("admin");

    const res = await agent
      .patch(`/api/v1/hostels/${missingId()}`)
      .send({ name: "New Name" });

    expect(res.status).toBe(404);
  });

  it("returns 409 when renaming to an existing name", async () => {
    await Hostel.init(); // make sure the unique index exists
    const { agent } = await loginAs("admin");
    await createHostel("Taken");
    const other = await createHostel("Other");

    const res = await agent
      .patch(`/api/v1/hostels/${other.id}`)
      .send({ name: "Taken" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });
});

describe("reading rooms", () => {
  it("lists rooms and filters by hostel", async () => {
    const { agent } = await loginAs("student");
    const a = await createHostel("Hostel A");
    const b = await createHostel("Hostel B");
    await Room.create({ hostel: a._id, roomNumber: "A1" });
    await Room.create({ hostel: a._id, roomNumber: "A2" });
    await Room.create({ hostel: b._id, roomNumber: "B1" });

    const all = await agent.get("/api/v1/rooms");
    const filtered = await agent.get(`/api/v1/rooms?hostel=${a.id}`);

    expect(all.status).toBe(200);
    expect(all.body.total).toBe(3);
    expect(filtered.body.total).toBe(2);
  });

  it("returns 400 for an invalid limit", async () => {
    const { agent } = await loginAs("student");

    const res = await agent.get("/api/v1/rooms?limit=100");

    expect(res.status).toBe(400);
  });

  it("gets one room, and returns 404 for an unknown one", async () => {
    const { agent } = await loginAs("student");
    const hostel = await createHostel();
    const room = await Room.create({ hostel: hostel._id, roomNumber: "R1" });

    const found = await agent.get(`/api/v1/rooms/${room.id}`);
    const missing = await agent.get(`/api/v1/rooms/${missingId()}`);

    expect(found.status).toBe(200);
    expect(found.body.room.roomNumber).toBe("R1");
    expect(missing.status).toBe(404);
  });
});

describe("updating rooms", () => {
  it("lets staff change the floor", async () => {
    const { agent } = await loginAs("staff");
    const hostel = await createHostel();
    const room = await Room.create({ hostel: hostel._id, roomNumber: "R1" });

    const res = await agent
      .patch(`/api/v1/rooms/${room.id}`)
      .send({ floor: 3 });

    expect(res.status).toBe(200);
    expect(res.body.floor).toBe(3);
  });

  it("returns 403 for a student", async () => {
    const { agent } = await loginAs("student");
    const hostel = await createHostel();
    const room = await Room.create({ hostel: hostel._id, roomNumber: "R1" });

    const res = await agent
      .patch(`/api/v1/rooms/${room.id}`)
      .send({ floor: 3 });

    expect(res.status).toBe(403);
  });

  it("returns 400 for an empty body or an unknown field", async () => {
    const { agent } = await loginAs("staff");
    const hostel = await createHostel();
    const room = await Room.create({ hostel: hostel._id, roomNumber: "R1" });

    const empty = await agent.patch(`/api/v1/rooms/${room.id}`).send({});
    const unknown = await agent
      .patch(`/api/v1/rooms/${room.id}`)
      .send({ name: "x" });

    expect(empty.status).toBe(400);
    expect(unknown.status).toBe(400);
  });

  it("returns 404 for an unknown room", async () => {
    const { agent } = await loginAs("staff");

    const res = await agent
      .patch(`/api/v1/rooms/${missingId()}`)
      .send({ floor: 1 });

    expect(res.status).toBe(404);
  });

  it("returns 409 when renumbering to a number already used in that hostel", async () => {
    await Room.init(); // make sure the unique index exists
    const { agent } = await loginAs("staff");
    const hostel = await createHostel();
    await Room.create({ hostel: hostel._id, roomNumber: "R1" });
    const other = await Room.create({ hostel: hostel._id, roomNumber: "R2" });

    const res = await agent
      .patch(`/api/v1/rooms/${other.id}`)
      .send({ roomNumber: "R1" });

    expect(res.status).toBe(409);
  });
});
