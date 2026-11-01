import type { UserRole } from "../users/user-model";
import { STATUSES } from "./ticket-model";

export type Status = (typeof STATUSES)[number];
type Who = "staff" | "reporter";

// the only allowed moves through the status endpoint, and who may make them
// (open -> assigned happens through the assign endpoint, not this table)
export const TRANSITIONS: { from: Status; to: Status; who: Who }[] = [
  { from: "assigned", to: "in_progress", who: "staff" },
  { from: "in_progress", to: "resolved", who: "staff" },
  { from: "resolved", to: "closed", who: "reporter" },
  { from: "resolved", to: "in_progress", who: "reporter" }, // reopen
];

export const findTransition = (from: Status, to: Status) =>
  TRANSITIONS.find((t) => t.from === from && t.to === to);

// admins can make any listed move, staff make "staff" moves, the reporter makes "reporter" moves
export const canMakeTransition = (
  who: Who,
  actor: { sub: string; role: UserRole },
  reportedBy: string,
) =>
  actor.role === "admin" ||
  (who === "staff" ? actor.role === "staff" : reportedBy === actor.sub);