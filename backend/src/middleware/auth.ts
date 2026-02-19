import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "path";
import pool from "../config/database";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export interface AuthUser {
  id: string;    // Supabase auth.users UUID (sub claim)
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Verifies the Supabase-issued JWT from the Authorization header.
 * Supabase JWT secret lives at SUPABASE_JWT_SECRET in .env
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.split(" ")[1];
  const secret = process.env.SUPABASE_JWT_SECRET;

  if (!secret) {
    res.status(500).json({ error: "Server misconfiguration: missing SUPABASE_JWT_SECRET" });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as any;
    req.user = { id: decoded.sub, email: decoded.email };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Restricts a route to verified veterinarians.
 * Checks that req.user.email exists in the veterinarians table.
 */
export function authorizeVet(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  pool
    .query("SELECT id FROM veterinarians WHERE email = $1 AND is_active = TRUE", [req.user.email])
    .then((result) => {
      if (result.rows.length === 0) {
        res.status(403).json({ error: "Vet account not found or inactive" });
        return;
      }
      // Attach vet's own DB id to request for convenience
      (req as any).vetId = result.rows[0].id;
      next();
    })
    .catch(() => res.status(500).json({ error: "Internal server error" }));
}
