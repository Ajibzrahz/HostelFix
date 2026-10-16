import mongoose from "mongoose";
import bcrypt from "bcrypt";
import env from "./config/env"; // adjust to match your env file
import User from "./modules/users/user-model";
import Hostel from "./modules/hostels/hostel-model";
import Room from "./modules/rooms/room-model";
import Ticket, { STATUSES } from "./modules/tickets/ticket-model";

type Status = (typeof STATUSES)[number];
type Category = "plumbing" | "electrical" | "furniture" | "other";
type Priority = "low" | "medium" | "high" | "urgent";
type Reporter = "ada" | "tunde" | "bisi";

interface Sample {
  title: string;
  description: string;
  category: Category;
  priority: Priority;
  status: Status;
  room: string; // room number
  reporter: Reporter;
  daysAgo: number;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

// Covers every status and priority, six rooms, and two recurring cases:
// B12 plumbing (days 12 and 3) and A1 electrical (days 20 and 5).
const samples: Sample[] = [
  {
    title: "Leaking tap in room B12",
    description: "Bathroom tap has been dripping since Monday.",
    category: "plumbing",
    priority: "medium",
    status: "resolved",
    room: "B12",
    reporter: "ada",
    daysAgo: 12,
  },
  {
    title: "Tap dripping again in B12",
    description: "The same tap started leaking again after the repair.",
    category: "plumbing",
    priority: "high",
    status: "open",
    room: "B12",
    reporter: "ada",
    daysAgo: 3,
  },
  {
    title: "Socket sparking in A1",
    description: "Wall socket by the bed sparks whenever it is used.",
    category: "electrical",
    priority: "urgent",
    status: "resolved",
    room: "A1",
    reporter: "tunde",
    daysAgo: 20,
  },
  {
    title: "Socket dead after repair",
    description: "The repaired socket in A1 no longer gives any power.",
    category: "electrical",
    priority: "high",
    status: "in_progress",
    room: "A1",
    reporter: "tunde",
    daysAgo: 5,
  },
  {
    title: "Broken study chair in C5",
    description: "One leg of the study chair is cracked and unsafe.",
    category: "furniture",
    priority: "low",
    status: "resolved",
    room: "C5",
    reporter: "bisi",
    daysAgo: 9,
  },
  {
    title: "Ceiling fan not working",
    description: "The fan does not spin on any speed setting.",
    category: "electrical",
    priority: "high",
    status: "in_progress",
    room: "A2",
    reporter: "bisi",
    daysAgo: 6,
  },
  {
    title: "Blocked bathroom drain",
    description: "Water drains very slowly after every shower.",
    category: "plumbing",
    priority: "high",
    status: "assigned",
    room: "B13",
    reporter: "ada",
    daysAgo: 4,
  },
  {
    title: "Wardrobe door off its hinge",
    description: "The left wardrobe door hangs loose and will not close.",
    category: "furniture",
    priority: "medium",
    status: "open",
    room: "C6",
    reporter: "tunde",
    daysAgo: 2,
  },
  {
    title: "Flickering ceiling light",
    description: "The main light flickers and sometimes goes off.",
    category: "electrical",
    priority: "medium",
    status: "assigned",
    room: "B13",
    reporter: "bisi",
    daysAgo: 7,
  },
  {
    title: "Window will not close",
    description: "The window latch is broken so the window stays open.",
    category: "other",
    priority: "medium",
    status: "open",
    room: "C5",
    reporter: "ada",
    daysAgo: 1,
  },
  {
    title: "Cracked bathroom mirror",
    description: "The mirror has a long crack across the middle.",
    category: "other",
    priority: "low",
    status: "resolved",
    room: "A2",
    reporter: "tunde",
    daysAgo: 15,
  },
  {
    title: "Mattress torn",
    description: "The mattress has a large tear and the foam is showing.",
    category: "furniture",
    priority: "low",
    status: "open",
    room: "A1",
    reporter: "bisi",
    daysAgo: 8,
  },
  {
    title: "No hot water in showers",
    description: "There has been no hot water on this floor for two days.",
    category: "plumbing",
    priority: "urgent",
    status: "assigned",
    room: "C6",
    reporter: "tunde",
    daysAgo: 2,
  },
  {
    title: "Door lock jammed",
    description: "The key turns but the door lock will not open.",
    category: "other",
    priority: "urgent",
    status: "in_progress",
    room: "B12",
    reporter: "bisi",
    daysAgo: 1,
  },
];

const run = async () => {
  if (env.nodeEnv === "production") {
    throw new Error("Refusing to seed a production database");
  }

  await mongoose.connect(env.mongoUri);

  // wipe everything this script creates so it can be re-run safely
  await Promise.all([
    User.deleteMany({}),
    Hostel.deleteMany({}),
    Room.deleteMany({}),
    Ticket.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash("Password123!", 10); // dummy password, dummy data only

  const [ada, tunde, bisi, staff, admin] = await User.insertMany([
    {
      name: "Ada Student",
      email: "ada@example.com",
      passwordHash,
      role: "student",
    },
    {
      name: "Tunde Student",
      email: "tunde@example.com",
      passwordHash,
      role: "student",
    },
    {
      name: "Bisi Student",
      email: "bisi@example.com",
      passwordHash,
      role: "student",
    },
    {
      name: "Chidi Staff",
      email: "chidi@example.com",
      passwordHash,
      role: "staff",
    },
    {
      name: "Amina Admin",
      email: "amina@example.com",
      passwordHash,
      role: "admin",
    },
  ]);
  const reporters = { ada, tunde, bisi };

  const hostel = await Hostel.create({
    name: "Unity Hall",
    location: "North Campus",
  });

  const roomDefs = [
    { roomNumber: "A1", floor: 0 },
    { roomNumber: "A2", floor: 0 },
    { roomNumber: "B12", floor: 1 },
    { roomNumber: "B13", floor: 1 },
    { roomNumber: "C5", floor: 2 },
    { roomNumber: "C6", floor: 2 },
  ];
  const rooms = await Room.insertMany(
    roomDefs.map((r) => ({ ...r, hostel: hostel._id })),
  );
  const roomId = Object.fromEntries(rooms.map((r) => [r.roomNumber, r._id]));

  // oldest first, so the recurring check only looks at earlier tickets
  const ordered = [...samples].sort((a, b) => b.daysAgo - a.daysAgo);
  const now = Date.now();

  const tickets = ordered.map((s, index) => {
    const createdAt = new Date(now - s.daysAgo * DAY);
    const reportedBy = reporters[s.reporter]._id;
    const upTo = STATUSES.indexOf(s.status);

    // same room + same category within the previous 30 days (mirrors the service logic)
    const isRecurring = ordered.slice(0, index).some((earlier) => {
      const gapInDays = earlier.daysAgo - s.daysAgo;
      return (
        earlier.room === s.room &&
        earlier.category === s.category &&
        gapInDays > 0 &&
        gapInDays <= 30
      );
    });

    const statusHistory = STATUSES.slice(0, upTo + 1).map((to, i) => ({
      from: i === 0 ? null : STATUSES[i - 1],
      to,
      changedBy: i === 0 ? reportedBy : staff._id,
      changedAt: new Date(createdAt.getTime() + i * 3 * HOUR),
    }));

    return {
      title: s.title,
      description: s.description,
      category: s.category,
      priority: s.priority,
      status: s.status,
      room: roomId[s.room],
      reportedBy,
      assignedTo: upTo >= 1 ? staff._id : null,
      isRecurring,
      statusHistory,
      resolvedAt:
        s.status === "resolved"
          ? statusHistory[statusHistory.length - 1].changedAt
          : null,
      createdAt,
    };
  });

  const created = await Ticket.insertMany(tickets);

  console.log(`Seeded ${created.length} tickets. Use these IDs in Postman:`);
  console.log("Users:");
  [ada, tunde, bisi, staff, admin].forEach((u) =>
    console.log(`  ${u.role.padEnd(8)} ${u.email.padEnd(20)} ${u._id}`),
  );
  console.log("Rooms:");
  rooms.forEach((r) => console.log(`  ${r.roomNumber.padEnd(4)} ${r._id}`));
  console.log(`Sample ticket: ${created[created.length - 1]._id}`);

  await mongoose.disconnect();

  console.log(
    `Database: ${mongoose.connection.name} on ${mongoose.connection.host}`,
  );
};

run().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
