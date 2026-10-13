import { Schema, model } from "mongoose";

const roomSchema = new Schema({
  hostel: { type: Schema.Types.ObjectId, ref: "Hostel", required: true },
  roomNumber: { type: String, required: true, trim: true },
  floor: { type: Number },
});

roomSchema.index({ hostel: 1, roomNumber: 1 }, { unique: true });

const Room = model("Room", roomSchema);
export default Room