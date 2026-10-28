import { StatusCodes } from "http-status-codes";
import { AppError } from "../../common/utils/app-error";
import {
  CreateRoomInput,
  ListRoomsQuery,
  UpdateRoomInput,
} from "./room-schema";
import Room from "./room-model";
import Ticket from "../tickets/ticket-model";
import Hostel from "../hostels/hostel-model";
import { Types } from "mongoose";

type PopulatedHostel = {
  _id: Types.ObjectId;
  name: string;
};

export async function createRoom(hostelId: string, data: CreateRoomInput) {
  if (!(await Hostel.exists({ _id: hostelId }))) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      "HOSTEL_NOT_FOUND",
      "Hostel does not exist",
    );
  }
  if (await Room.exists({ hostel: hostelId, roomNumber: data.roomNumber })) {
    throw new AppError(
      StatusCodes.CONFLICT,
      "CONFLICT",
      "This hostel already has a room with that number",
    );
  }
  const room = await Room.create({ ...data, hostel: hostelId });
  return room;
}
export async function listRooms(query: ListRoomsQuery) {
  const { page, limit, hostel } = query;
  const filter = query.hostel ? { hostel } : {};

  const [data, total] = await Promise.all([
    Room.find()
      .populate<{ hostel: PopulatedHostel }>("hostel", "name")
      .sort({ roomNumber: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Room.countDocuments(filter),
  ]);

  const rooms = data.map((room) => ({
    hostelName: room.hostel?.name,
    roomNumber: room.roomNumber,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    id: room._id.toString(),
  }));

  return {
    data: rooms,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function listHostelRooms(
  hostelId: string,
  query: Omit<ListRoomsQuery, "hostel">,
) {
  if (!(await Hostel.exists({ _id: hostelId }))) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      "HOSTEL_NOT_FOUND",
      "Hostel not found",
    );
  }
  return listRooms({ ...query, hostel: hostelId });
}

export async function getRoom(id: string) {
  const room = await Room.findById(id).populate<{ hostel: PopulatedHostel }>(
    "hostel",
    "name",
  );
  if (!room) {
    throw new AppError(StatusCodes.NOT_FOUND, "NOT_FOUND", "room not found");
  }
  return {
    room: {
      hostelName: room.hostel?.name,
      roomNumber: room.roomNumber,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      id: room._id.toString(),
    },
  };
}
export async function updateRoom(id: string, data: UpdateRoomInput["body"]) {
  const room = await Room.findByIdAndUpdate(
    id,
    { $set: data },
    {
      returnDocument: "after",
      runValidators: true,
    },
  );

  if (!room) {
    throw new AppError(StatusCodes.NOT_FOUND, "NOT_FOUND", "hostel not found");
  }

  return room;
}

export async function deleteRoom(id: string) {
  if (await Ticket.exists({ room: id })) {
    throw new AppError(
      StatusCodes.CONFLICT,
      "ROOM_HAS_TICKETS",
      "Cannot delete a room that still has tickets",
    );
  }
  const room = await Room.findByIdAndDelete(id);
  if (!room) {
    throw new AppError(StatusCodes.NOT_FOUND, "NOT_FOUND", "room not found");
  }
}
