import { loginAs } from "../helpers/auth";
import { createTicket } from "../helpers/factories";

describe("ticket ownership", () => {
  it("returns 401 when not logged in", async () => {
    const request = (await import("supertest")).default;
    const app = (await import("../../src/app")).default;

    const res = await request(app).get("/api/v1/tickets");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 403 when a student opens another student's ticket", async () => {
    const { agent: ada } = await loginAs("student");
    const { user: tunde } = await loginAs("student");
    const ticket = await createTicket({ reportedBy: tunde._id });

    const res = await ada.get(`/api/v1/tickets/${ticket.id}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("lets staff open any ticket", async () => {
    const { user: ada } = await loginAs("student");
    const { agent: staff } = await loginAs("staff");
    const ticket = await createTicket({ reportedBy: ada._id });

    const res = await staff.get(`/api/v1/tickets/${ticket.id}`);

    expect(res.status).toBe(200);
  });
});