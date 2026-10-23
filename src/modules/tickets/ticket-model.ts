import { Schema, model } from "mongoose";

export const CATEGORIES = [
  "plumbing",
  "electrical",
  "furniture",
  "other",
] as const;
export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const STATUSES = [
  "open",
  "assigned",
  "in_progress",
  "resolved",
  "closed"
] as const;

const commentSchema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const statusChangeSchema = new Schema(
  {
    from: { type: String, default: null },
    to: { type: String, enum: STATUSES, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const ticketSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 1000,
    },
    category: { type: String, enum: CATEGORIES, required: true },
    priority: { type: String, enum: PRIORITIES, default: "medium" },
    status: { type: String, enum: STATUSES, default: "open" },
    room: { type: Schema.Types.ObjectId, ref: "Room", required: true },
    reportedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
    isRecurring: { type: Boolean, default: false },
    comments: { type: [commentSchema], default: [] },
    statusHistory: { type: [statusChangeSchema], default: [] },
    resolvedAt: { type: Date, default: null },
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

ticketSchema.index({ status: 1 });
ticketSchema.index({ room: 1, category: 1, createdAt: -1 });
ticketSchema.index({ reportedBy: 1 });
ticketSchema.index({ createdAt: -1 });

const Ticket = model("Ticket", ticketSchema);
export default Ticket;
