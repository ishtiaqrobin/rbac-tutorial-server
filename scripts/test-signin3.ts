import "dotenv/config";
import { auth } from "../src/app/lib/auth";

async function main() {
  console.log("Testing signInEmail with asResponse...");
  try {
    const result: any = await auth.api.signInEmail({
      body: { email: "admin@example.com", password: "Admin123!" },
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      asResponse: true,
    });
    console.log("is Response:", result instanceof Response);
    if (result instanceof Response) {
      console.log("status:", result.status);
      console.log("set-cookie:", result.headers.get("set-cookie"));
    } else {
      console.log("result:", JSON.stringify(result));
    }
  } catch (e: any) {
    console.error("FAILED:", e.status, e.message);
  }
}
main().finally(() => process.exit(0));
