import mongoose from "mongoose";
import bcrypt from "bcrypt";
import env from "./config/env";
import User from "./modules/users/user-model";
import Room from "./modules/rooms/room-model";
import Hostel from "./modules/hostels/hostel-model";

const run = async () => {
  if (env.nodeEnv === "production") {
    throw new Error("Refusing to seed a production database");
  }

  await mongoose.connect(env.mongoUri);

  // wipe and recreate so the script can be re-run safely
  await Promise.all([User.deleteMany({}), Hostel.deleteMany({}), Room.deleteMany({})]);

  const passwordHash = await bcrypt.hash("Password123!", 10);

  const users = await User.insertMany([
    { name: "Ada Student", email: "ada@example.com", passwordHash, role: "student" },
    { name: "Tunde Student", email: "tunde@example.com", passwordHash, role: "student" },
    { name: "Chidi Staff", email: "chidi@example.com", passwordHash, role: "staff" },
    { name: "Amina Admin", email: "amina@example.com", passwordHash, role: "admin" },
  ]);

  const hostel = await Hostel.create({ name: "Unity Hall", location: "North Campus" });

  const rooms = await Room.insertMany(
    ["A1", "A2", "B12", "B13", "C5", "C6"].map((roomNumber) => ({
      hostel: hostel._id,
      roomNumber,
      floor: Number(roomNumber.length > 2 ? 1 : 0),
    })),
  );

  console.log("Seed complete. Use these IDs in requests/tickets.http:");
  console.log("Users:", users.map((u) => `${u.role} ${u.email} -> ${u._id}`));
  console.log("Rooms:", rooms.map((r) => `${r.roomNumber} -> ${r._id}`));

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});