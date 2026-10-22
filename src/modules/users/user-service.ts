import { StatusCodes } from "http-status-codes";
import userModel from "./user-model";
import { AppError } from "../../common/utils/app-error";
import { UpdateUserInput } from "./user-schema";

export async function getUser(id: string) {
  const user = await userModel.findById(id);

  if (!user) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      "USER_NOT_FOUND",
      "user not found",
    );
  }
  return user;
}

export async function updateUser(id: string, update: UpdateUserInput) {
  const user = await userModel.findByIdAndUpdate(id, update, {
    returnDocument: "after",
    runValidators: true,
  });
  if (!user) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      "USER_NOT_FOUND",
      "user not found",
    );
  }
  return user;
}
