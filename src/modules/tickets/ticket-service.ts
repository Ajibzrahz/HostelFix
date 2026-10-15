import dayjs from "dayjs";
import { AppError } from "../../utils/app-error";
import Room from "../rooms/room-model";
import User from "../users/user-model";
import Ticket from "./ticket-model";
import type {
  CreateTicketInput,
  ListTicketsQuery,
  UpdateTicketInput,
} from "./ticket-schema";
import mongoose, { QueryFilter, UpdateQuery } from "mongoose";
import { StatusCodes } from "http-status-codes";

const assertValidId = (id: string) => {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "INVALID_ID",
      "Invalid ticket ID",
    );
  }
};

export const createTicket = async (data: CreateTicketInput) => {
  const roomExist = await Room.exists({ _id: data.room });
  if (!roomExist) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      "ROOM_NOT_FOUND",
      "Room not found",
    );
  }
  const user = await User.exists({ _id: data.reportedBy });
  if (!user) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      "USER_NOT_FOUND",
      "Reporting user not found",
    );
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
  assertValidId(id);
  const ticket = await Ticket.findById(id);
  if (!ticket) {
    throw new AppError(StatusCodes.NOT_FOUND, "NOT_FOUND", "Ticket not found");
  }
  return ticket;
};

export const listTickets = async (query: ListTicketsQuery) => {
  const { page, limit, sort, status, priority, category, room } = query;

  // only include filters that were actually sent
  const filter = Object.fromEntries(
    Object.entries({ status, priority, category, room }).filter(
      ([, value]) => value !== undefined,
    ),
  );

  const sortOrder = sort === "createdAt" ? 1 : -1;

  const [data, total] = await Promise.all([
    Ticket.find(filter)
      .sort({ createdAt: sortOrder, _id: sortOrder }) // _id keeps page order stable
      .skip((page - 1) * limit)
      .limit(limit),
    Ticket.countDocuments(filter),
  ]);

  return { data, page, limit, total, totalPages: Math.ceil(total / limit) };
};

export const updateTicket = async (id: string, data: UpdateTicketInput) => {
  assertValidId(id);

  const ticket = await Ticket.findByIdAndUpdate(
    id,
    { $set: data },
    { returnDocument: "after", runValidators: true },
  );

  if (!ticket) {
    throw new AppError(StatusCodes.NOT_FOUND, "NOT_FOUND", "Ticket not found");

  }
  return ticket;
};

export const deleteTicket = async (id: string) => {
  assertValidId(id);

  const ticket = await Ticket.findByIdAndDelete(id)

  if (!ticket) {
    throw new AppError(StatusCodes.NOT_FOUND, "NOT_FOUND", "Ticket not found");

  }
  return ticket;
};
