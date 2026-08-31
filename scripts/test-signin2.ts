import "dotenv/config";
import { auth } from "../src/app/lib/auth";

async function main() {
  console.log("Testing signInEmail with returnHeaders...");
  try {
    const result: any = await auth.api.signInEmail({
      body: { email: "admin@example.com", password: "Admin123!" },
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
    });
    console.log("result keys:", Object.keys(result));
    console.log("result type:", typeof result);
    console.log("full result:", JSON.stringify(result, (k,v) => k==='user'?{id:v.id,email:v.email}:v, 2));
  } catch (e: any) {
    console.error("FAILED:", e.status, e.message);
  }
}
main().finally(() => process.exit(0));
