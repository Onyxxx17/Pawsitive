import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "path";

// Load .env from project root (Pawsitive/)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "fallback-refresh-secret";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "30d";

export interface TokenPayload {
  id: string;
  email: string;
  role: "user" | "vet";
}

/**
 * Generate an access token (short-lived).
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Generate a refresh token (long-lived).
 */
export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
}

/**
 * Verify an access token and return the decoded payload.
 */
export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

/**
 * Verify a refresh token and return the decoded payload.
 */
export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
}
