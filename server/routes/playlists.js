import express from 'express';
import { dbAll, dbGet, dbRun } from '../db.js';

const router = express.Router();

// GET /playlists - Get all playlists
router.get('/', async (req, res) => {
  try {
    const playlists = await dbAll(`
      SELECT 
        p.id,
        p.name,
        p.week_start_date,
        p.created_date,
        COUNT(wp.id) as workout_count
      FROM playlists p
      LEFT JOIN weekly_planner wp ON p.week_start_date = wp.week_start_date
      GROUP BY p.id, p.name, p.week_start_date, p.created_date
      ORDER BY p.created_date DESC
    `);
    res.json(playlists);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /playlists/:id - Get a specific playlist
router.get('/:id', async (req, res) => {
  try {
    const playlist = await dbGet('SELECT * FROM playlists WHERE id = ?', [req.params.id]);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    res.json(playlist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /playlists - Create a new playlist
router.post('/', async (req, res) => {
  try {
    const { name, week_start_date } = req.body;

    if (!name || !week_start_date) {
      return res.status(400).json({ error: 'name and week_start_date are required' });
    }

    // Check if playlist with same name and week_start_date already exists
    const existing = await dbGet(
      'SELECT id FROM playlists WHERE name = ? AND week_start_date = ?',
      [name, week_start_date]
    );
    if (existing) {
      return res.status(409).json({ error: 'Playlist with this name and week already exists' });
    }

    await dbRun(`
      INSERT INTO playlists (name, week_start_date, created_date)
      VALUES (?, ?, datetime('now'))
    `, [name, week_start_date]);

    const playlist = await dbGet('SELECT * FROM playlists WHERE name = ? AND week_start_date = ?', [name, week_start_date]);
    res.status(201).json(playlist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /playlists/:id - Update playlist name
router.patch('/:id', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const playlist = await dbGet('SELECT * FROM playlists WHERE id = ?', [req.params.id]);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    // Check if new name conflicts with existing playlist for same week
    const existing = await dbGet(
      'SELECT id FROM playlists WHERE name = ? AND week_start_date = ? AND id != ?',
      [name, playlist.week_start_date, req.params.id]
    );
    if (existing) {
      return res.status(409).json({ error: 'Playlist with this name and week already exists' });
    }

    await dbRun('UPDATE playlists SET name = ? WHERE id = ?', [name, req.params.id]);

    const updated = await dbGet('SELECT * FROM playlists WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /playlists/:id - Delete a playlist
router.delete('/:id', async (req, res) => {
  try {
    const result = await dbRun('DELETE FROM playlists WHERE id = ?', [req.params.id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    res.json({ message: 'Playlist deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

