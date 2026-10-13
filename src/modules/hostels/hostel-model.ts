import { Schema, model } from "mongoose";

const hostelSchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  location: { type: String, trim: true },
});

const Hostel = model("Hostel", hostelSchema);
export default Hostel