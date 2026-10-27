import User from "../users/user-model";
import { CreateUserInput, VerifyEmailInput } from "../users/user-schema";
import { sendVerificationEmail } from "../../common/service/email-verification";
import { AppError } from "../../common/utils/app-error";
import { StatusCodes } from "http-status-codes";
import { createHash } from "node:crypto";
import logger from "../../common/utils/logger"; // adjust path

export async function createUser(input: CreateUserInput) {
  const { name, email, password } = input;

  const userExist = await User.findOne({ email });
  if (userExist) {
    throw new AppError(StatusCodes.CONFLICT, "CONFLICT", "User already exists");
  }

  const user = await User.create({
    name,
    email,
    passwordHash: password,
    role: "student",
  });

  let emailSent = true;
  try {
    await sendVerificationEmail(user._id.toString(), user.name, user.email);
  } catch (err) {
    emailSent = false;
    logger.error(
      { err, userId: user._id },
      "Failed to send verification email",
    );
  }

  return { user, emailSent };
}

export const verifyEmail = async (query: VerifyEmailInput) => {
  const { token, email } = query;

  const tokenHash = createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({ email }).select(
    "+emailVerificationTokenHash +emailVerificationTokenExpiresAt",
  );

  if (!user) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "INVALID_VERIFICATION_LINK",
      "Invalid or expired verification link",
    );
  }

  if (user.isEmailVerified) {
    return { alreadyVerified: true };
  }

  const tokenMatches = user.emailVerificationTokenHash === tokenHash;

  const tokenIsExpired =
    !user.emailVerificationTokenExpiresAt ||
    user.emailVerificationTokenExpiresAt.getTime() <= Date.now();

  if (!tokenMatches || tokenIsExpired) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "INVALID_VERIFICATION_LINK",
      "Invalid or expired verification link",
    );
  }

  user.isEmailVerified = true;
  user.emailVerifiedAt = new Date();
  user.emailVerificationTokenHash = null;
  user.emailVerificationTokenExpiresAt = null;

  await user.save();

  return { alreadyVerified: false };
};

export const resendVerificationEmail = async (email: string) => {
  const user = await User.findOne({ email });

  if (!user || user.isEmailVerified) return;

  try {
    await sendVerificationEmail(user._id.toString(), user.name, user.email);
  } catch (err) {
    logger.error(
      { err, userId: user._id },
      "Failed to resend verification email",
    );
  }
};

export async function validatePassword({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user) {
    return false;
  }

  const isValid = await user.comparePassword(password);
  if (!isValid) {
    return false;
  }

  return user;
}
