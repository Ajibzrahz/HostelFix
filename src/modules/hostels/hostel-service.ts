import { StatusCodes } from "http-status-codes";
import { AppError } from "../../common/utils/app-error";
import Hostel from "./hostel-model";
import {
  CreateHostelInput,
  ListHostelsQuery,
  UpdateHostelInput,
} from "./hostel-schema";

export async function createHostel(data: CreateHostelInput) {
  if (await Hostel.exists({ name: data.name })) {
    throw new AppError(
      StatusCodes.CONFLICT,
      "CONFLICT",
      "A hostel with this name already exists",
    );
  }
  const hostel = await Hostel.create(data);
  return hostel;
}

export async function listHostel(query: ListHostelsQuery) {
  const { page, limit } = query;
  const [data, total] = await Promise.all([
    Hostel.find()
      .sort({ name: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Hostel.countDocuments(),
  ]);
  return { data, page, limit, total, totalPages: Math.ceil(total / limit) };
}

export async function getHostel(id: string) {
  const hostel = await Hostel.findById(id);
  if (!hostel) {
    throw new AppError(StatusCodes.NOT_FOUND, "NOT_FOUND", "hostel not found");
  }
  return hostel;
}

export async function updateHostel(id: string, data: UpdateHostelInput["body"]) {
  const hostel = await Hostel.findByIdAndUpdate(
    id,
    { $set: data },
    {
      returnDocument: "after",
      runValidators: true,
    },
  );

  if (!hostel) {
    throw new AppError(StatusCodes.NOT_FOUND, "NOT_FOUND", "hostel not found");
  }

  return hostel;
}

// export async function deleteHostel(id: string) {
//   if (await Room.exists({ hostel: id })) {
//     throw new AppError(
//       StatusCodes.CONFLICT,
//       "HOSTEL_HAS_ROOMS",
//       "Cannot delete a hostel that still has rooms",
//     );
//   }
//   const hostel = await Hostel.findByIdAndDelete(id);
//   if (!hostel) {
//     throw new AppError(StatusCodes.NOT_FOUND, "NOT_FOUND", "Hostel not found");
//   }
// }
