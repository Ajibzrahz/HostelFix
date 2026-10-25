import dayjs from "dayjs";
import { AppError } from "../../common/utils/app-error";
import Room from "../rooms/room-model";
import User, { UserRole } from "../users/user-model";
import Ticket, { STATUSES } from "./ticket-model";
import type {
  AssignTicketInput,
  CreateTicketInput,
  ListTicketsQuery,
  TicketCommentInput,
  UpdateStatusInput,
  UpdateTicketInput,
} from "./ticket-schema";
import { StatusCodes } from "http-status-codes";

export type Actor = { sub: string; role: UserRole };

type Status = (typeof STATUSES)[number];

const TRANSITIONS: { from: Status; to: Status; who: "staff" | "reporter" }[] = [
  { from: "assigned", to: "in_progress", who: "staff" },
  { from: "in_progress", to: "resolved", who: "staff" },
  { from: "resolved", to: "closed", who: "reporter" },
  { from: "resolved", to: "in_progress", who: "reporter" },
];

const ACTIVE_STATUSES = ["open", "assigned", "in_progress"] as const;

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

  const alreadyReported = await Ticket.exists({
    room: data.room,
    category: data.category,
    status: { $in: [...ACTIVE_STATUSES] },
  });
  if (alreadyReported) {
    throw new AppError(
      StatusCodes.CONFLICT,
      "DUPLICATE_TICKET",
      "A ticket for this problem in this room is already being handled",
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

export const assignTicket = async (
  id: string,
  update: AssignTicketInput,
  actor: Actor,
) => {
  const assignee = await User.findById(update.assignedTo).select("role");
  if (!assignee) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      "USER_NOT_FOUND",
      "User not found",
    );
  }
  if (assignee.role === "student") {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "INVALID_ASSIGNEE",
      "A ticket can only be assigned to staff or an admin",
    );
  }

  const ticket = await Ticket.findById(id);
  if (!ticket) {
    throw new AppError(StatusCodes.NOT_FOUND, "NOT_FOUND", "Ticket not found");
  }
  if (ticket.status === "resolved" || ticket.status === "closed") {
    throw new AppError(
      StatusCodes.CONFLICT,
      "INVALID_TRANSITION",
      "A resolved or closed ticket cannot be assigned",
    );
  }

  const changes: Record<string, unknown> = {
    $set: { assignedTo: update.assignedTo },
  };
  if (ticket.status === "open") {
    changes.$set = { assignedTo: update.assignedTo, status: "assigned" };
    changes.$push = {
      statusHistory: {
        from: "open",
        to: "assigned",
        changedBy: actor.sub,
        changedAt: new Date(),
      },
    };
  }

  return Ticket.findByIdAndUpdate(id, changes, {
    returnDocument: "after",
    runValidators: true,
  });
};

export const updateTicketStatus = async (
  id: string,
  update: UpdateStatusInput,
  actor: Actor,
) => {
  const ticket = await Ticket.findById(id);
  if (!ticket) {
    throw new AppError(StatusCodes.NOT_FOUND, "NOT_FOUND", "Ticket not found");
  }
  assertCanAccess(ticket, actor);

  const from = ticket.status as Status;
  const to = update.status;

  const rule = TRANSITIONS.find((t) => t.from === from && t.to === to);
  if (!rule) {
    throw new AppError(
      StatusCodes.CONFLICT,
      "INVALID_TRANSITION",
      `Cannot move a ticket from ${from} to ${to}`,
    );
  }

  const allowed =
    actor.role === "admin" ||
    (rule.who === "staff"
      ? actor.role === "staff"
      : String(ticket.reportedBy) === actor.sub);
  if (!allowed) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "FORBIDDEN",
      "You are not allowed to make this status change",
    );
  }

  const set: Record<string, unknown> = { status: to };
  if (to === "resolved") set.resolvedAt = new Date();
  if (to === "closed") set.confirmedAt = new Date();
  if (from === "resolved" && to === "in_progress") set.resolvedAt = null;

  // matching on the old status stops two people changing it at the same moment
  const updated = await Ticket.findOneAndUpdate(
    { _id: id, status: from },
    {
      $set: set,
      $push: {
        statusHistory: {
          from,
          to,
          changedBy: actor.sub,
          changedAt: new Date(),
        },
      },
    },
    { returnDocument: "after", runValidators: true },
  );
  if (!updated) {
    throw new AppError(
      StatusCodes.CONFLICT,
      "INVALID_TRANSITION",
      "The ticket was changed by someone else, please try again",
    );
  }
  return updated;
};

export const ticketComment = async (
  id: string,
  update: TicketCommentInput,
  actor: Actor,
) => {
  const ticket = await Ticket.findById(id);
  if (!ticket) {
    throw new AppError(StatusCodes.NOT_FOUND, "NOT_FOUND", "Ticket not found");
  }
  assertCanAccess(ticket, actor);

  return Ticket.findByIdAndUpdate(
    id,
    { $push: { comments: { author: actor.sub, body: update.body } } },
    { returnDocument: "after", runValidators: true },
  );
};
