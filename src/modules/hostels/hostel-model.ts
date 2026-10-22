import { Document, Schema, model } from "mongoose";

export interface HostelDocument extends Document {
  name: string;
  location: string;
}

const hostelSchema = new Schema<HostelDocument>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    location: { type: String, trim: true },
  },
  { 
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = ret._id
        delete ret._id
        return ret
      }
    }
  },
);

const Hostel = model<HostelDocument>("Hostel", hostelSchema);
export default Hostel;
