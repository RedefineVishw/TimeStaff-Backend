// One-off local seed script — not wired into the app.
// Run with: npx tsx prisma/seed.ts
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env["DATABASE_URL"] });
const prisma = new PrismaClient({ adapter });

type SeedTask = {
  name: string;
  minutes: number; // total time to backdate for this task
};

type SeedProject = {
  name: string;
  color: string;
  tasks: SeedTask[];
};

const DATA: SeedProject[] = [
  {
    name: "Website Redesign",
    color: "#4F46E5",
    tasks: [
      { name: "Homepage layout", minutes: 45 },
      { name: "Navbar component", minutes: 90 },
      { name: "Contact form", minutes: 120 },
      { name: "SEO audit", minutes: 30 },
      { name: "Blog page", minutes: 180 },
    ],
  },
  {
    name: "Mobile App",
    color: "#059669",
    tasks: [
      { name: "Login screen", minutes: 60 },
      { name: "Push notifications", minutes: 150 },
      { name: "Onboarding flow", minutes: 45 },
      { name: "Bug fixes", minutes: 75 },
      { name: "App icon design", minutes: 30 },
    ],
  },
];

async function main() {
  console.log("Clearing existing TimeEntry / Task / Project rows...");
  await prisma.timeEntry.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();

  let dayOffset = 1; // start "yesterday" and walk further back per task

  for (const projectData of DATA) {
    const project = await prisma.project.create({
      data: { name: projectData.name, color: projectData.color },
    });
    console.log(`Created project: ${project.name}`);

    for (const taskData of projectData.tasks) {
      const task = await prisma.task.create({
        data: { name: taskData.name, projectId: project.id },
      });

      // Back-date the entry so it lands mid-morning on a past day, then
      // set endedAt exactly `minutes` later — durationSeconds mirrors it.
      const startedAt = new Date();
      startedAt.setDate(startedAt.getDate() - dayOffset);
      startedAt.setHours(10, 0, 0, 0);

      const endedAt = new Date(startedAt.getTime() + taskData.minutes * 60_000);

      await prisma.timeEntry.create({
        data: {
          taskId: task.id,
          startedAt,
          endedAt,
          durationSeconds: taskData.minutes * 60,
          source: "desktop",
        },
      });

      console.log(`  Task "${task.name}" — ${taskData.minutes} min logged`);
      dayOffset += 1;
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
