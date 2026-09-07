import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // CLI-only connection (migrate/studio). The running app uses DATABASE_URL
    // (pooled) via its own driver adapter, wired up separately.
    url: process.env["DIRECT_URL"],
  },
});
