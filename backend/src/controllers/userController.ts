import { Request, Response } from "express";
import pool from "../config/database";

// ─── GET MY PROFILE ─────────────────────────────────────────

export async function getMyProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;

    const result = await pool.query(
      `SELECT id, email, name, avatar_url, phone_number,
              notification_preferences, timezone, created_at, updated_at
       FROM users WHERE id = $1 AND is_active = TRUE`,
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.status(200).json({ user: result.rows[0] });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── UPDATE MY PROFILE ─────────────────────────────────────

export async function updateMyProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { name, avatar_url, phone_number, notification_preferences, timezone } = req.body;

    const result = await pool.query(
      `UPDATE users
       SET name                      = COALESCE($1, name),
           avatar_url                = COALESCE($2, avatar_url),
           phone_number              = COALESCE($3, phone_number),
           notification_preferences  = COALESCE($4, notification_preferences),
           timezone                  = COALESCE($5, timezone)
       WHERE id = $6 AND is_active = TRUE
       RETURNING id, email, name, avatar_url, phone_number,
                 notification_preferences, timezone, created_at, updated_at`,
      [name, avatar_url, phone_number, notification_preferences, timezone, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.status(200).json({
      message: "Profile updated successfully",
      user: result.rows[0],
    });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── DELETE MY ACCOUNT (soft delete) ─────────────────────────

export async function deleteMyAccount(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;

    await pool.query("UPDATE users SET is_active = FALSE WHERE id = $1", [userId]);

    res.status(200).json({ message: "Account deactivated successfully" });
  } catch (err) {
    console.error("Delete account error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
