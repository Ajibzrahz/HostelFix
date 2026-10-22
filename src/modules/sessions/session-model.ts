import mongoose from "mongoose";
import { UserDocument } from "../users/user-model";

export interface sessionDocument extends mongoose.Document {
  user: UserDocument["_id"];
  valid: boolean;
  userAgent: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword: Promise<boolean>;
}

const userSchema = new mongoose.Schema<sessionDocument>(
  {
    user: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    valid: {
      type: Boolean,
      default: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

const sessionModel = mongoose.model<sessionDocument>("Session", userSchema);
export default sessionModel;
