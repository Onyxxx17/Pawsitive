import { Request, Response } from "express";
import pool from "../config/database";

// ─── GET MY PROFILE ─────────────────────────────────────────
// Email is owned by Supabase auth.users — we expose it from the JWT,
// never from the profiles table, so it stays locked/read-only.

export async function getMyProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const email  = req.user?.email; // from Supabase JWT — always accurate

    const result = await pool.query(
      `SELECT id, name, avatar_url, phone_number,
              notification_preferences, timezone, created_at, updated_at
       FROM profiles
       WHERE id = $1 AND is_active = TRUE`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Profile row may not exist yet for brand-new Supabase users — create it
      const insert = await pool.query(
        `INSERT INTO profiles (id) VALUES ($1)
         RETURNING id, name, avatar_url, phone_number,
                   notification_preferences, timezone, created_at, updated_at`,
        [userId]
      );
      res.status(200).json({ user: { ...insert.rows[0], email } });
      return;
    }

    res.status(200).json({ user: { ...result.rows[0], email } });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── UPDATE MY PROFILE ─────────────────────────────────────
// Allowed fields: name, avatar_url, phone_number,
//                 notification_preferences, timezone
// Email is NOT updatable here — change it through Supabase auth.

export async function updateMyProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const email  = req.user?.email;
    const { name, avatar_url, phone_number, notification_preferences, timezone } = req.body;

    const result = await pool.query(
      `INSERT INTO profiles (id, name, avatar_url, phone_number,
                             notification_preferences, timezone)
       VALUES ($6, $1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE
         SET name                     = COALESCE(EXCLUDED.name,                     profiles.name),
             avatar_url               = COALESCE(EXCLUDED.avatar_url,               profiles.avatar_url),
             phone_number             = COALESCE(EXCLUDED.phone_number,             profiles.phone_number),
             notification_preferences = COALESCE(EXCLUDED.notification_preferences, profiles.notification_preferences),
             timezone                 = COALESCE(EXCLUDED.timezone,                 profiles.timezone),
             updated_at               = NOW()
       RETURNING id, name, avatar_url, phone_number,
                 notification_preferences, timezone, created_at, updated_at`,
      [name, avatar_url, phone_number, notification_preferences, timezone, userId]
    );

    res.status(200).json({
      message: "Profile updated successfully",
      user: { ...result.rows[0], email },
    });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── DEACTIVATE MY ACCOUNT (soft delete) ─────────────────────
// Hard deletion / auth removal should be done via Supabase admin SDK.

export async function deleteMyAccount(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;

    await pool.query("UPDATE profiles SET is_active = FALSE WHERE id = $1", [userId]);

    res.status(200).json({ message: "Account deactivated successfully" });
  } catch (err) {
    console.error("Delete account error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
