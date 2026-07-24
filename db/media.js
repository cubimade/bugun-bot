// ============================================================
//  DB/MEDIA.JS — 9.5: media kutubxona so'rovlari
//  Fayllar bytea sifatida saqlanadi — Railway diski efemer,
//  database esa doimiy. Hajm chegarasi API darajasida.
// ============================================================
import { pool } from "./pool.js";

export async function listMedia() {
  const { rows } = await pool.query(
    `SELECT m.id, m.project_id, m.name, m.type, m.mime, m.size, m.is_portfolio,
            m.created_at, p.name AS project_name
       FROM media_library m
       LEFT JOIN projects p ON p.id = m.project_id
      ORDER BY m.id DESC`
  );
  return rows;
}

export async function insertMedia({ projectId, name, type, mime, size, data }) {
  const { rows } = await pool.query(
    `INSERT INTO media_library (project_id, name, type, mime, size, data)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [projectId || null, name, type, mime, size, data]
  );
  return rows[0].id;
}

export async function deleteMedia(id) {
  await pool.query(`DELETE FROM media_library WHERE id = $1`, [id]);
}

export async function getMediaFile(id) {
  const { rows } = await pool.query(
    `SELECT id, name, mime, size, data FROM media_library WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function getMediaMeta(id) {
  const { rows } = await pool.query(
    `SELECT id, name, type, mime, size, is_portfolio FROM media_library WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function totalMediaSize() {
  const { rows } = await pool.query(
    `SELECT COALESCE(SUM(size), 0)::bigint AS total FROM media_library`
  );
  return Number(rows[0].total);
}

export async function setMediaPortfolio(id, value) {
  await pool.query(`UPDATE media_library SET is_portfolio = $2 WHERE id = $1`, [id, value]);
}

// Portfolio rasmlari — "ishlaringizni ko'rsating" so'ralganda yuboriladi
export async function listPortfolioMedia(projectId, limit = 3) {
  const { rows } = await pool.query(
    `SELECT id, name, mime FROM media_library
      WHERE is_portfolio AND type = 'image'
        AND (project_id IS NULL OR project_id = $1)
      ORDER BY id DESC LIMIT $2`,
    [projectId, limit]
  );
  return rows;
}
