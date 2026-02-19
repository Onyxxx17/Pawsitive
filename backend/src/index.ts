import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

// Load .env from project root (Pawsitive/)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import userRoutes from "./routes/user";
import vetRoutes from "./routes/vet";

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Health Check ───────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Routes ─────────────────────────────────────────────────
// Auth is handled client-side by Supabase — no /api/auth routes needed
app.use("/api/users", userRoutes);
app.use("/api/vets", vetRoutes);

// ─── 404 Handler ────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ─── Start Server ───────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Pawsitive API running on http://localhost:${PORT}`);
});

export default app;
