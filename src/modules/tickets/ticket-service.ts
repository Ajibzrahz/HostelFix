import dayjs from "dayjs";
import { AppError } from "../../common/utils/app-error";
import Room from "../rooms/room-model";
import { UserRole } from "../users/user-model";
import Ticket from "./ticket-model";
import type {
  CreateTicketInput,
  ListTicketsQuery,
  UpdateTicketInput,
} from "./ticket-schema";
import { StatusCodes } from "http-status-codes";

export type Actor = { sub: string; role: UserRole };

const assertCanAccess = (ticket: { reportedBy: unknown }, actor: Actor) => {
  if (actor.role === "student" && String(ticket.reportedBy) !== actor.sub) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "FORBIDDEN",
      "You do not have access to this ticket",
    );
  }
};

export const createTicket = async (data: CreateTicketInput, actor: Actor) => {
  const roomExist = await Room.exists({ _id: data.room });
  if (!roomExist) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      "ROOM_NOT_FOUND",
      "Room not found",
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
    reportedBy: actor.sub,
    statusHistory: [
      {
        from: null,
        to: "open",
        changedBy: actor.sub,
        changedAt: new Date(),
      },
    ],
  });
};

export const getTicket = async (id: string, actor: Actor) => {
  const ticket = await Ticket.findById(id);
  if (!ticket) {
    throw new AppError(StatusCodes.NOT_FOUND, "NOT_FOUND", "Ticket not found");
  }
  assertCanAccess(ticket, actor);
  return ticket;
};

export const listTickets = async (query: ListTicketsQuery, actor: Actor) => {
  const { page, limit, sort, status, priority, category, room } = query;

  const filter = Object.fromEntries(
    Object.entries({
      status,
      priority,
      category,
      room,
    }).filter(([, value]) => value !== undefined),
  );
  if (actor.role === "student") {
    filter.reportedBy = actor.sub;
  }
  const sortOrder = sort === "createdAt" ? 1 : -1;

  const [data, total] = await Promise.all([
    Ticket.find(filter)
      .sort({ createdAt: sortOrder, _id: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit),
    Ticket.countDocuments(filter),
  ]);

  return { data, page, limit, total, totalPages: Math.ceil(total / limit) };
};

export const updateTicket = async (
  id: string,
  data: UpdateTicketInput["body"],
  actor: Actor,
) => {
  const ticket = await Ticket.findById(id);
  if (!ticket) {
    throw new AppError(StatusCodes.NOT_FOUND, "NOT_FOUND", "Ticket not found");
  }
  assertCanAccess(ticket, actor);

  if (actor.role === "student" && ticket.status !== "open") {
    throw new AppError(
      StatusCodes.CONFLICT,
      "TICKET_LOCKED",
      "This ticket can no longer be edited because work has started",
    );
  }

  const updated = await Ticket.findByIdAndUpdate(
    id,
    { $set: data },
    { returnDocument: "after", runValidators: true },
  );
  if (!updated) {
    throw new AppError(StatusCodes.NOT_FOUND, "NOT_FOUND", "Ticket not found");
  }
  return updated;
};

export const deleteTicket = async (id: string) => {
  const ticket = await Ticket.findByIdAndDelete(id);

  if (!ticket) {
    throw new AppError(StatusCodes.NOT_FOUND, "NOT_FOUND", "Ticket not found");
  }
  return ticket;
};
