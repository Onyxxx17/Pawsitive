import { Request, Response } from "express";
import bcrypt from "bcrypt";
import pool from "../config/database";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  TokenPayload,
} from "../utils/jwt";

const SALT_ROUNDS = 10;

// ─── USER REGISTRATION ─────────────────────────────────────

export async function registerUser(req: Request, res: Response): Promise<void> {
  try {
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
      res.status(400).json({ error: "Email, name, and password are required" });
      return;
    }

    // Check if user already exists
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: "A user with this email already exists" });
      return;
    }

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, avatar_url, phone_number, timezone, created_at`,
      [email, passwordHash, name]
    );

    const user = result.rows[0];
    const payload: TokenPayload = { id: user.id, email: user.email, role: "user" };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.status(201).json({
      message: "User registered successfully",
      user,
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("Register user error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── USER LOGIN ─────────────────────────────────────────────

export async function loginUser(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const result = await pool.query(
      `SELECT id, email, name, password_hash, avatar_url, phone_number, timezone, is_active
       FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const user = result.rows[0];

    if (!user.is_active) {
      res.status(403).json({ error: "Account is deactivated" });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const payload: TokenPayload = { id: user.id, email: user.email, role: "user" };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Remove password_hash from response
    const { password_hash, ...safeUser } = user;

    res.status(200).json({
      message: "Login successful",
      user: safeUser,
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("Login user error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── VET REGISTRATION ───────────────────────────────────────

export async function registerVet(req: Request, res: Response): Promise<void> {
  try {
    const {
      email,
      password,
      name,
      clinic_name,
      specializations,
      bio,
      license_number,
      years_experience,
      consultation_fee,
      languages,
    } = req.body;

    if (!email || !password || !name || !consultation_fee) {
      res.status(400).json({ error: "Email, password, name, and consultation fee are required" });
      return;
    }

    // Check if vet already exists
    const existing = await pool.query("SELECT id FROM veterinarians WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: "A veterinarian with this email already exists" });
      return;
    }

    // Hash password — store it in a password_hash column we add to the vets table
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO veterinarians
         (email, password_hash, name, clinic_name, specializations, bio,
          license_number, years_experience, consultation_fee, languages)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, email, name, clinic_name, specializations, bio,
                 license_number, years_experience, consultation_fee,
                 languages, rating, total_reviews, created_at`,
      [
        email,
        passwordHash,
        name,
        clinic_name || null,
        specializations || "{}",
        bio || null,
        license_number || null,
        years_experience || null,
        consultation_fee,
        languages || '{"English"}',
      ]
    );

    const vet = result.rows[0];
    const payload: TokenPayload = { id: vet.id, email: vet.email, role: "vet" };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.status(201).json({
      message: "Veterinarian registered successfully",
      vet,
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("Register vet error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── VET LOGIN ──────────────────────────────────────────────

export async function loginVet(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const result = await pool.query(
      `SELECT id, email, name, password_hash, clinic_name, specializations, bio,
              license_number, years_experience, consultation_fee, languages,
              rating, total_reviews, is_active
       FROM veterinarians WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const vet = result.rows[0];

    if (!vet.is_active) {
      res.status(403).json({ error: "Account is deactivated" });
      return;
    }

    const validPassword = await bcrypt.compare(password, vet.password_hash);
    if (!validPassword) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const payload: TokenPayload = { id: vet.id, email: vet.email, role: "vet" };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    const { password_hash, ...safeVet } = vet;

    res.status(200).json({
      message: "Login successful",
      vet: safeVet,
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("Login vet error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── REFRESH TOKEN ──────────────────────────────────────────

export async function refreshToken(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      res.status(400).json({ error: "Refresh token is required" });
      return;
    }

    const decoded = verifyRefreshToken(token);
    const payload: TokenPayload = { id: decoded.id, email: decoded.email, role: decoded.role };
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired refresh token" });
  }
}
