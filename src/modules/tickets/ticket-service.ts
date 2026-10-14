import dayjs from "dayjs";
import { AppError } from "../../utils/app-error";
import Room from "../rooms/room-model";
import User from "../users/user-model";
import Ticket from "./ticket-model";
import type { CreateTicketInput } from "./ticket-schema";
import mongoose from "mongoose";

export const createTicket = async (data: CreateTicketInput) => {
  const roomExist = await Room.exists({ _id: data.room });
  if (!roomExist) {
    throw new AppError(404, "ROOM_NOT_FOUND", "Room not found");
  }
  const user = await User.exists({ _id: data.reportedBy });
  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "Reporting user not found");
  }

  // recurring = same room already has a ticket of the same category in the last 30 days
  const since = dayjs().subtract(30, "days").toDate();
  const isRecurring = !!(await Ticket.exists({
    room: data.room,
    category: data.category,
    createdAt: { $gte: since },
  }));

  return Ticket.create({
    ...data,
    status: "open",
    isRecurring,
    statusHistory: [
      {
        from: null,
        to: "open",
        changedBy: data.reportedBy,
        changedAt: new Date(),
      },
    ],
  });
};

export const getTicket = async (id: string) => {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw new AppError(400, "INVALID_ID", "Invalid ticket ID");
  }
  const ticket = await Ticket.findById(id);
  if (!ticket) {
    throw new AppError(404, "NOT_FOUND", "Ticket not found");
  }
  return ticket;
};
