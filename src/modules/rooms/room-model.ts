import { Document, Schema, model } from "mongoose";
import { HostelDocument } from "../hostels/hostel-model";

export interface RoomDocument extends Document {
  hostel: HostelDocument["_id"];
  roomNumber: string;
  floor: number;
  createdAt: Date;
  updatedAt: Date;
}

const roomSchema = new Schema<RoomDocument>(
  {
    hostel: { type: Schema.Types.ObjectId, ref: "Hostel", required: true },
    roomNumber: { type: String, required: true, trim: true },
    floor: { type: Number },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  },
);

roomSchema.index({ hostel: 1, roomNumber: 1 }, { unique: true });

const Room = model<RoomDocument>("Room", roomSchema);
export default Room;
