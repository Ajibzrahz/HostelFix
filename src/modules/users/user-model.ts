import { Document, Schema, model } from "mongoose";
import bcrypt from "bcrypt";

export const ROLES = ["student", "staff", "admin"] as const;
export type UserRole = (typeof ROLES)[number];

export interface UserDocument extends Document {
  name: string;
  email: string;
  role: UserRole;
  passwordHash: string;
  isEmailVerified: boolean;
  emailVerificationTokenHash: string | null;
  emailVerifiedAt: Date | null;
  emailVerificationTokenExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ROLES,
      default: "student",
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerifiedAt: {
      type: Date,
      default: null,
    },
    emailVerificationTokenHash: {
      type: String,
      default: null,
      select: false,
    },
    emailVerificationTokenExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },
  },

  { timestamps: true },
);

userSchema.pre("save", async function () {
  let self = this as UserDocument;

  if (!self.isModified("passwordHash")) {
    return;
  }
  const genSalt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(self.passwordHash, genSalt);

  self.passwordHash = hash;
});

userSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  let self = this as UserDocument;

  return await bcrypt.compare(candidatePassword, self.passwordHash);
};

const User = model<UserDocument>("User", userSchema);
export default User;
