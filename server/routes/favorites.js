import express from 'express';
import { dbAll, dbGet, dbRun } from '../db.js';

const router = express.Router();

// GET /favorites - Get all favorite workouts
router.get('/', async (req, res) => {
  try {
    const items = await dbAll(`
      SELECT 
        f.id,
        f.workout_id,
        f.added_date,
        w.title,
        w.video_url,
        w.duration_min,
        w.intensity,
        w.primary_target,
        w.channel_name,
        w.type,
        w.notes
      FROM favorites f
      JOIN workouts w ON f.workout_id = w.workout_id
      ORDER BY f.added_date DESC
    `);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /favorites - Add workout to favorites
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

    // Check if already in favorites
    const existing = await dbGet('SELECT id FROM favorites WHERE workout_id = ?', [workout_id]);
    if (existing) {
      return res.status(409).json({ error: 'Workout already in favorites' });
    }

    await dbRun(`
      INSERT INTO favorites (workout_id, added_date)
      VALUES (?, datetime('now'))
    `, [workout_id]);

    const favorite = await dbGet(`
      SELECT 
        f.id,
        f.workout_id,
        f.added_date,
        w.title,
        w.video_url,
        w.duration_min,
        w.intensity,
        w.primary_target,
        w.channel_name,
        w.type,
        w.notes
      FROM favorites f
      JOIN workouts w ON f.workout_id = w.workout_id
      WHERE f.workout_id = ?
    `, [workout_id]);

    res.status(201).json(favorite);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /favorites/:workout_id - Remove workout from favorites
router.delete('/:workout_id', async (req, res) => {
  try {
    const { workout_id } = req.params;

    const result = await dbRun('DELETE FROM favorites WHERE workout_id = ?', [workout_id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Favorite not found' });
    }

    res.json({ message: 'Removed from favorites' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

