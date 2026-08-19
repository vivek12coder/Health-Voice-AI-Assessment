import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export const config = {
  sarvamApiKey: process.env.SARVAM_API_KEY || "",
  port: parseInt(process.env.PORT || "5000", 10),
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
} as const;

if (!config.sarvamApiKey) {
  console.error("❌ SARVAM_API_KEY is not set. Please check your .env file.");
  process.exit(1);
}

console.log("✅ Environment loaded successfully");
console.log(`   Port: ${config.port}`);
console.log(`   Client URL: ${config.clientUrl}`);
console.log(`   Sarvam API Key: ${config.sarvamApiKey.slice(0, 8)}...`);
