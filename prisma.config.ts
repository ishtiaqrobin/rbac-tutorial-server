import "dotenv/config";
import { defineConfig } from "prisma/config";
import { env } from "./src/app/config/env";

export default defineConfig({
  schema: "prisma/schema",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // url: process.env["DATABASE_URL"]!,
    url: env.DATABASE_URL,
  },
});
