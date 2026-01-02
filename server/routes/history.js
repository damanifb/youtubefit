import express from 'express';
import { dbAll, dbGet, dbRun } from '../db.js';

const router = express.Router();

// POST /history - Log a workout session
router.post('/', async (req, res) => {
  try {
    const { date, workout_id, warmup_id, cooldown_id } = req.body;

    if (!date || !workout_id) {
      return res.status(400).json({ error: 'date and workout_id are required' });
    }

    // Verify workout exists
    const workout = await dbGet('SELECT workout_id FROM workouts WHERE workout_id = ?', [workout_id]);
    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    // Verify warmup if provided
    if (warmup_id) {
      const warmup = await dbGet('SELECT workout_id FROM workouts WHERE workout_id = ? AND type = ?', [warmup_id, 'warmup']);
      if (!warmup) {
        return res.status(404).json({ error: 'Warmup not found' });
      }
    }

    // Verify cooldown if provided
    if (cooldown_id) {
      const cooldown = await dbGet('SELECT workout_id FROM workouts WHERE workout_id = ? AND type = ?', [cooldown_id, 'cooldown']);
      if (!cooldown) {
        return res.status(404).json({ error: 'Cooldown not found' });
      }
    }

    // Insert history record (append-only)
    const { notes } = req.body;
    const result = await dbRun(`
      INSERT INTO workout_history (date, workout_id, warmup_id, cooldown_id, notes)
      VALUES (?, ?, ?, ?, ?)
    `, [date, workout_id, warmup_id || null, cooldown_id || null, notes || null]);

    const historyEntry = await dbGet('SELECT * FROM workout_history WHERE id = ?', [result.lastID]);
    res.status(201).json(historyEntry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /history - Get workout history
router.get('/', async (req, res) => {
  try {
    const { start_date, end_date, workout_id } = req.query;

    let sql = `
      SELECT 
        h.*,
        w.title as workout_title,
        w.video_url as workout_url,
        w.type as workout_type,
        wm.title as warmup_title,
        wm.video_url as warmup_url,
        wc.title as cooldown_title,
        wc.video_url as cooldown_url
      FROM workout_history h
      LEFT JOIN workouts w ON h.workout_id = w.workout_id
      LEFT JOIN workouts wm ON h.warmup_id = wm.workout_id
      LEFT JOIN workouts wc ON h.cooldown_id = wc.workout_id
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      sql += ' AND h.date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND h.date <= ?';
      params.push(end_date);
    }

    if (workout_id) {
      sql += ' AND h.workout_id = ?';
      params.push(workout_id);
    }

    sql += ' ORDER BY h.date DESC, h.id DESC';

    const history = await dbAll(sql, params);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /history/:id - Update history entry (notes)
router.patch('/:id', async (req, res) => {
  try {
    const { notes } = req.body;
    
    const historyEntry = await dbGet('SELECT * FROM workout_history WHERE id = ?', [req.params.id]);
    if (!historyEntry) {
      return res.status(404).json({ error: 'History entry not found' });
    }

    await dbRun('UPDATE workout_history SET notes = ? WHERE id = ?', [notes || null, req.params.id]);

    const updated = await dbGet(`
      SELECT 
        h.*,
        w.title as workout_title,
        w.video_url as workout_url,
        w.type as workout_type,
        wm.title as warmup_title,
        wm.video_url as warmup_url,
        wc.title as cooldown_title,
        wc.video_url as cooldown_url
      FROM workout_history h
      LEFT JOIN workouts w ON h.workout_id = w.workout_id
      LEFT JOIN workouts wm ON h.warmup_id = wm.workout_id
      LEFT JOIN workouts wc ON h.cooldown_id = wc.workout_id
      WHERE h.id = ?
    `, [req.params.id]);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /history/:id - Delete history entry
router.delete('/:id', async (req, res) => {
  try {
    const historyEntry = await dbGet('SELECT * FROM workout_history WHERE id = ?', [req.params.id]);
    if (!historyEntry) {
      return res.status(404).json({ error: 'History entry not found' });
    }

    await dbRun('DELETE FROM workout_history WHERE id = ?', [req.params.id]);
    res.json({ message: 'History entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /history - Clear all history
router.delete('/', async (req, res) => {
  try {
    await dbRun('DELETE FROM workout_history');
    res.json({ message: 'All history cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

