import express from 'express';
import { dbAll, dbGet, dbRun } from '../db.js';

const router = express.Router();

// GET /watchlater - Get all watch later items
router.get('/', async (req, res) => {
  try {
    const items = await dbAll(`
      SELECT 
        wl.*,
        w.title,
        w.video_url,
        w.duration_min,
        w.intensity,
        w.primary_target,
        w.channel_name,
        w.type
      FROM watch_later wl
      JOIN workouts w ON wl.workout_id = w.workout_id
      ORDER BY wl.added_date DESC
    `);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /watchlater - Add workout to watch later
router.post('/', async (req, res) => {
  try {
    const { workout_id } = req.body;

    if (!workout_id) {
      return res.status(400).json({ error: 'workout_id is required' });
    }

    // Verify workout exists
    const workout = await dbGet('SELECT workout_id FROM workouts WHERE workout_id = ?', [workout_id]);
    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    // Check if already in watch later
    const existing = await dbGet('SELECT id FROM watch_later WHERE workout_id = ?', [workout_id]);
    if (existing) {
      return res.status(409).json({ error: 'Workout already in watch later' });
    }

    await dbRun(`
      INSERT INTO watch_later (workout_id, added_date)
      VALUES (?, datetime('now'))
    `, [workout_id]);

    const item = await dbGet(`
      SELECT 
        wl.*,
        w.title,
        w.video_url,
        w.duration_min,
        w.intensity,
        w.primary_target,
        w.channel_name,
        w.type
      FROM watch_later wl
      JOIN workouts w ON wl.workout_id = w.workout_id
      WHERE wl.workout_id = ?
    `, [workout_id]);

    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /watchlater/:workout_id - Remove workout from watch later
router.delete('/:workout_id', async (req, res) => {
  try {
    const result = await dbRun('DELETE FROM watch_later WHERE workout_id = ?', [req.params.workout_id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Workout not found in watch later' });
    }
    res.json({ message: 'Removed from watch later' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

