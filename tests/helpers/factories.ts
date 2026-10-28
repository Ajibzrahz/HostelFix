import type { Types } from "mongoose";
import Hostel from "../../src/modules/hostels/hostel-model";
import Room from "../../src/modules/rooms/room-model";
import Ticket from "../../src/modules/tickets/ticket-model";

let counter = 0;

export const createHostel = (name = "Test Hostel") => Hostel.create({ name });

export async function createRoom() {
  counter += 1;
  const hostel = await Hostel.create({ name: `Hostel ${counter}` });
  return Room.create({ hostel: hostel._id, roomNumber: `R${counter}` });
}

export async function createTicket(overrides: {
  reportedBy: Types.ObjectId | string;
  room?: Types.ObjectId | string;
  category?: "plumbing" | "electrical" | "furniture" | "other";
  status?: "open" | "assigned" | "in_progress" | "resolved" | "closed";
  assignedTo?: Types.ObjectId | string;
}) {
  const room = overrides.room ?? (await createRoom())._id;

  return Ticket.create({
    title: "Leaking tap in the room",
    description: "The tap has been dripping since Monday.",
    ...overrides,
    category: overrides.category ?? "plumbing",
    room,
    statusHistory: [
      {
        from: null,
        to: overrides.status ?? "open",
        changedBy: overrides.reportedBy,
        changedAt: new Date(),
      },
    ],
  });
}