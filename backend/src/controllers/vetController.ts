import { Request, Response } from "express";
import pool from "../config/database";

// ─── GET MY VET PROFILE ─────────────────────────────────────

export async function getMyVetProfile(req: Request, res: Response): Promise<void> {
  try {
    const vetId = req.user?.id;

    const result = await pool.query(
      `SELECT id, email, name, clinic_name, specializations, bio,
              profile_photo_url, license_number, years_experience,
              consultation_fee, rating, total_reviews, languages,
              created_at, updated_at
       FROM veterinarians WHERE id = $1 AND is_active = TRUE`,
      [vetId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Veterinarian not found" });
      return;
    }

    res.status(200).json({ vet: result.rows[0] });
  } catch (err) {
    console.error("Get vet profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── UPDATE MY VET PROFILE ──────────────────────────────────

export async function updateMyVetProfile(req: Request, res: Response): Promise<void> {
  try {
    const vetId = req.user?.id;
    const {
      name,
      clinic_name,
      specializations,
      bio,
      profile_photo_url,
      license_number,
      years_experience,
      consultation_fee,
      languages,
    } = req.body;

    const result = await pool.query(
      `UPDATE veterinarians
       SET name                = COALESCE($1, name),
           clinic_name         = COALESCE($2, clinic_name),
           specializations     = COALESCE($3, specializations),
           bio                 = COALESCE($4, bio),
           profile_photo_url   = COALESCE($5, profile_photo_url),
           license_number      = COALESCE($6, license_number),
           years_experience    = COALESCE($7, years_experience),
           consultation_fee    = COALESCE($8, consultation_fee),
           languages           = COALESCE($9, languages)
       WHERE id = $10 AND is_active = TRUE
       RETURNING id, email, name, clinic_name, specializations, bio,
                 profile_photo_url, license_number, years_experience,
                 consultation_fee, rating, total_reviews, languages,
                 created_at, updated_at`,
      [
        name,
        clinic_name,
        specializations,
        bio,
        profile_photo_url,
        license_number,
        years_experience,
        consultation_fee,
        languages,
        vetId,
      ]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Veterinarian not found" });
      return;
    }

    res.status(200).json({
      message: "Vet profile updated successfully",
      vet: result.rows[0],
    });
  } catch (err) {
    console.error("Update vet profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── GET PUBLIC VET PROFILE (for users browsing vets) ───────

export async function getVetPublicProfile(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, name, clinic_name, specializations, bio,
              profile_photo_url, years_experience, consultation_fee,
              rating, total_reviews, languages
       FROM veterinarians WHERE id = $1 AND is_active = TRUE`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Veterinarian not found" });
      return;
    }

    res.status(200).json({ vet: result.rows[0] });
  } catch (err) {
    console.error("Get public vet profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── LIST ALL ACTIVE VETS (for users browsing) ─────────────

export async function listVets(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const specialization = req.query.specialization as string;

    let query = `
      SELECT id, name, clinic_name, specializations, bio,
             profile_photo_url, years_experience, consultation_fee,
             rating, total_reviews, languages
      FROM veterinarians
      WHERE is_active = TRUE
    `;
    const params: any[] = [];

    if (specialization) {
      params.push(specialization);
      query += ` AND $${params.length} = ANY(specializations)`;
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM veterinarians WHERE is_active = TRUE${
        specialization ? ` AND $1 = ANY(specializations)` : ""
      }`,
      specialization ? [specialization] : []
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    params.push(limit, offset);
    query += ` ORDER BY rating DESC NULLS LAST LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await pool.query(query, params);

    res.status(200).json({
      vets: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("List vets error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── DEACTIVATE VET ACCOUNT (soft delete) ───────────────────

export async function deactivateVetAccount(req: Request, res: Response): Promise<void> {
  try {
    const vetId = req.user?.id;

    await pool.query("UPDATE veterinarians SET is_active = FALSE WHERE id = $1", [vetId]);

    res.status(200).json({ message: "Vet account deactivated successfully" });
  } catch (err) {
    console.error("Deactivate vet error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
