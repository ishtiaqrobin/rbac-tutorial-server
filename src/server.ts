import app from "./app";
import { prisma } from "./app/lib/prisma";

const PORT = process.env.PORT || 5000;

async function main() {
  try {
    await prisma.$connect();
    console.log("Database connected successfully");

    app.listen(PORT, () => {
      console.log(
        `RBAC Tutorial Backend is running on http://localhost:${PORT}`,
      );
    });
  } catch (error) {
    console.error("Error starting server:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();

export default app;
