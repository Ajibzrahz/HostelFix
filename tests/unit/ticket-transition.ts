import { STATUSES } from "../../src/modules/tickets/ticket-model";
import { findTransition, canMakeTransition } from "../../src/modules/tickets/ticket-transition";
const reporter = "reporter-id";

describe("status transition table", () => {
  it("allows exactly four moves and no others", () => {
    const found: string[] = [];
    for (const from of STATUSES) {
      for (const to of STATUSES) {
        if (findTransition(from, to)) found.push(`${from} > ${to}`);
      }
    }

    expect(found.sort()).toEqual([
      "assigned > in_progress",
      "in_progress > resolved",
      "resolved > closed",
      "resolved > in_progress",
    ]);
  });

  it("has no move out of a closed ticket", () => {
    for (const to of STATUSES) {
      expect(findTransition("closed", to)).toBeUndefined();
    }
  });

  it("has no move out of open (assigning does that)", () => {
    for (const to of STATUSES) {
      expect(findTransition("open", to)).toBeUndefined();
    }
  });

  it("does not allow skipping a step", () => {
    expect(findTransition("assigned", "resolved")).toBeUndefined();
    expect(findTransition("in_progress", "closed")).toBeUndefined();
  });

  it("does not allow moving backwards, except the reopen", () => {
    expect(findTransition("in_progress", "assigned")).toBeUndefined();
    expect(findTransition("resolved", "in_progress")).toEqual({
      from: "resolved",
      to: "in_progress",
      who: "reporter",
    });
  });
});

describe("who may make a move", () => {
  it("lets staff make staff moves, and nobody else except admins", () => {
    expect(canMakeTransition("staff", { sub: "s1", role: "staff" }, reporter)).toBe(true);
    expect(canMakeTransition("staff", { sub: reporter, role: "student" }, reporter)).toBe(false);
    expect(canMakeTransition("staff", { sub: "a1", role: "admin" }, reporter)).toBe(true);
  });

  it("lets only the reporting student (or an admin) make reporter moves", () => {
    expect(canMakeTransition("reporter", { sub: reporter, role: "student" }, reporter)).toBe(true);
    expect(canMakeTransition("reporter", { sub: "other", role: "student" }, reporter)).toBe(false);
    expect(canMakeTransition("reporter", { sub: "s1", role: "staff" }, reporter)).toBe(false);
    expect(canMakeTransition("reporter", { sub: "a1", role: "admin" }, reporter)).toBe(true);
  });
});