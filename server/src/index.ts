import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { config } from "./config/env.js";
import { handleVoiceSocket } from "./websocket/voiceSocket.js";

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);
app.use(express.json());

// ─── HTTP Routes ─────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ─── Create HTTP + WebSocket Server ──────────────────────────────────────────

const server = createServer(app);

const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws) => {
  handleVoiceSocket(ws);
});

wss.on("error", (error) => {
  console.error("[WSS] WebSocket server error:", error);
});

// ─── Start Server ────────────────────────────────────────────────────────────

server.listen(config.port, () => {
  console.log(`\n🚀 Health Voice AI Server running on port ${config.port}`);
  console.log(`   HTTP: http://localhost:${config.port}`);
  console.log(`   WebSocket: ws://localhost:${config.port}/ws`);
  console.log(`   Health: http://localhost:${config.port}/health\n`);
});
