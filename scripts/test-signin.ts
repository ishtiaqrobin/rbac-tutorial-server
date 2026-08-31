import "dotenv/config";
import { auth } from "../src/app/lib/auth";

async function main() {
  console.log("Testing Better-Auth signInEmail...");
  try {
    const result = await auth.api.signInEmail({
      body: { email: "admin@example.com", password: "Admin123!" },
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
    });
    console.log("SUCCESS");
    console.log("user:", result.user?.id, result.user?.email);
    console.log("token present:", !!result.token);
    console.log("headers keys:", result.headers ? Object.keys(result.headers) : "none");
    if (result.headers instanceof Headers) {
      console.log("set-cookie:", result.headers.get("set-cookie"));
    }
  } catch (e: any) {
    console.error("FAILED:", e.status, e.message);
    console.error("details:", e.details);
  }
}

main().finally(() => process.exit(0));