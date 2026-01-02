import express from 'express';
import { dbAll, dbGet, dbRun } from '../db.js';

const router = express.Router();

// GET /workouts - List workouts with optional filters
router.get('/', async (req, res) => {
  try {
    const {
      type,
      intensity,
      primary_target,
      equipment,
      vetted,
      do_not_recommend,
      link_status,
      min_duration,
      max_duration,
      channel_name
    } = req.query;

    let sql = 'SELECT * FROM workouts WHERE 1=1';
    const params = [];

    if (type) {
      if (type === 'yoga') {
        // Filter for yoga workouts - check type column first, then fallback to title/channel
        sql += ` AND (
          type = 'yoga'
          OR LOWER(title) LIKE '%yoga%' 
          OR LOWER(channel_name) LIKE '%yoga%'
          OR LOWER(channel_name) LIKE '%adriene%'
          OR LOWER(channel_name) LIKE '%nancy%'
        )`;
      } else {
        sql += ' AND type = ?';
        params.push(type);
      }
    }

    if (intensity) {
      sql += ' AND intensity = ?';
      params.push(intensity);
    }

    if (primary_target) {
      sql += ' AND (primary_target = ? OR target_tag1 = ? OR target_tag2 = ?)';
      params.push(primary_target, primary_target, primary_target);
    }

    if (equipment) {
      sql += ' AND equipment = ?';
      params.push(equipment);
    }

    if (vetted !== undefined) {
      sql += ' AND vetted = ?';
      params.push(vetted === 'true' || vetted === '1' ? 1 : 0);
    }

    if (do_not_recommend !== undefined) {
      sql += ' AND do_not_recommend = ?';
      params.push(do_not_recommend === 'true' || do_not_recommend === '1' ? 1 : 0);
    }

    if (link_status) {
      sql += ' AND link_status = ?';
      params.push(link_status);
    }

    if (min_duration) {
      sql += ' AND duration_min >= ?';
      params.push(parseInt(min_duration, 10));
    }

    if (max_duration) {
      sql += ' AND duration_min <= ?';
      params.push(parseInt(max_duration, 10));
    }

    if (channel_name) {
      sql += ' AND channel_name = ?';
      params.push(channel_name);
    }

    sql += ' ORDER BY title';

    const workouts = await dbAll(sql, params);
    res.json(workouts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /workouts/channels - Get list of channels with workout counts (no filters - always show total)
router.get('/channels', async (req, res) => {
  try {
    // Always return total count per channel, regardless of any filters
    const sql = `
      SELECT channel_name, COUNT(*) as workout_count
      FROM workouts
      GROUP BY channel_name
      ORDER BY channel_name ASC
    `;

    const channels = await dbAll(sql);
    res.json(channels);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /workouts/:id - Get single workout
router.get('/:id', async (req, res) => {
  try {
    const workout = await dbGet('SELECT * FROM workouts WHERE workout_id = ?', [req.params.id]);
    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }
    res.json(workout);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /workouts - Create workout (admin/local use)
router.post('/', async (req, res) => {
  try {
    const {
      workout_id,
      yt_id,
      title,
      channel_name,
      channel_code,
      video_url,
      type,
      primary_target,
      target_tag1,
      target_tag2,
      intensity,
      duration_min,
      equipment,
      vetted = false,
      do_not_recommend = false,
      rating,
      repeat_cooldown_days = 5,
      link_status = 'ok',
      last_checked
    } = req.body;

    // Validate required fields
    if (!workout_id || !yt_id || !title || !type || !intensity || !equipment) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check for duplicate YT_ID
    const existing = await dbGet('SELECT workout_id FROM workouts WHERE yt_id = ?', [yt_id]);
    if (existing) {
      return res.status(409).json({ error: 'Workout with this YT_ID already exists' });
    }

    await dbRun(`
      INSERT INTO workouts (
        workout_id, yt_id, title, channel_name, channel_code, video_url,
        type, primary_target, target_tag1, target_tag2,
        intensity, duration_min, equipment,
        vetted, do_not_recommend, rating, repeat_cooldown_days,
        link_status, last_checked
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      workout_id, yt_id, title, channel_name || null, channel_code || null, video_url,
      type, primary_target, target_tag1 || null, target_tag2 || null,
      intensity, duration_min, equipment,
      vetted ? 1 : 0, do_not_recommend ? 1 : 0, rating || null, repeat_cooldown_days,
      link_status, last_checked || null
    ]);

    const workout = await dbGet('SELECT * FROM workouts WHERE workout_id = ?', [workout_id]);
    res.status(201).json(workout);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /workouts/:id - Update workout
router.patch('/:id', async (req, res) => {
  try {
    const workout = await dbGet('SELECT * FROM workouts WHERE workout_id = ?', [req.params.id]);
    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    const updates = [];
    const params = [];

    const allowedFields = [
      'title', 'channel_name', 'channel_code', 'video_url',
      'type', 'primary_target', 'target_tag1', 'target_tag2',
      'intensity', 'duration_min', 'equipment',
      'vetted', 'do_not_recommend', 'rating', 'repeat_cooldown_days',
      'link_status', 'last_checked', 'notes'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        if (field === 'vetted' || field === 'do_not_recommend') {
          params.push(req.body[field] ? 1 : 0);
        } else if (field === 'notes') {
          // Convert empty string to null for notes
          params.push(req.body[field] === '' ? null : req.body[field]);
        } else {
          params.push(req.body[field]);
        }
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    params.push(req.params.id);
    await dbRun(`UPDATE workouts SET ${updates.join(', ')} WHERE workout_id = ?`, params);

    const updated = await dbGet('SELECT * FROM workouts WHERE workout_id = ?', [req.params.id]);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

