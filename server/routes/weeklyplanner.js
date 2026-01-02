import express from 'express';
import { dbAll, dbGet, dbRun } from '../db.js';

const router = express.Router();

// Helper to get Monday of current week
function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  // Calculate days to subtract to get to Monday
  // Sunday (0) -> subtract 6 days, Monday (1) -> subtract 0, Tuesday (2) -> subtract 1, etc.
  const daysToSubtract = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - daysToSubtract);
  return d.toISOString().split('T')[0];
}

// GET /weeklyplanner - Get current week's plan
router.get('/', async (req, res) => {
  try {
    const { week_start } = req.query;
    const weekStart = week_start || getWeekStart();

    const plan = await dbAll(`
      SELECT 
        wp.*,
        w.title as workout_title,
        w.video_url as workout_url,
        w.duration_min,
        w.intensity,
        w.primary_target,
        w.channel_name,
        wm.title as warmup_title,
        wm.video_url as warmup_url,
        wc.title as cooldown_title,
        wc.video_url as cooldown_url
      FROM weekly_planner wp
      JOIN workouts w ON wp.workout_id = w.workout_id
      LEFT JOIN workouts wm ON wp.warmup_id = wm.workout_id
      LEFT JOIN workouts wc ON wp.cooldown_id = wc.workout_id
      WHERE wp.week_start_date = ?
      ORDER BY 
        CASE wp.day_of_week
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
        END
    `, [weekStart]);

    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /weeklyplanner/month - Get all plans for a given month
router.get('/month', async (req, res) => {
  try {
    const { year, month } = req.query; // month is 1-12, year is YYYY
    
    if (!year || !month) {
      return res.status(400).json({ error: 'year and month are required' });
    }

    // Calculate first and last day of the month
    const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1);
    const lastDay = new Date(parseInt(year), parseInt(month), 0);
    
    // Get Monday of the week containing first day
    const firstDayOfWeek = new Date(firstDay);
    const firstDayWeekday = firstDayOfWeek.getDay();
    const diffToMonday = firstDayWeekday === 0 ? -6 : 1 - firstDayWeekday;
    firstDayOfWeek.setDate(firstDay.getDate() + diffToMonday);
    
    // Get Monday of the week containing last day
    const lastDayOfWeek = new Date(lastDay);
    const lastDayWeekday = lastDayOfWeek.getDay();
    const diffToMondayLast = lastDayWeekday === 0 ? -6 : 1 - lastDayWeekday;
    lastDayOfWeek.setDate(lastDay.getDate() + diffToMondayLast);
    
    const weekStartFirst = firstDayOfWeek.toISOString().split('T')[0];
    const weekStartLast = lastDayOfWeek.toISOString().split('T')[0];

    // Get all weekly plans that overlap with this month
    const plans = await dbAll(`
      SELECT 
        wp.*,
        w.title as workout_title,
        w.video_url as workout_url,
        w.duration_min,
        w.intensity,
        w.primary_target,
        w.channel_name,
        wm.title as warmup_title,
        wm.video_url as warmup_url,
        wc.title as cooldown_title,
        wc.video_url as cooldown_url
      FROM weekly_planner wp
      JOIN workouts w ON wp.workout_id = w.workout_id
      LEFT JOIN workouts wm ON wp.warmup_id = wm.workout_id
      LEFT JOIN workouts wc ON wp.cooldown_id = wc.workout_id
      WHERE wp.week_start_date >= ? AND wp.week_start_date <= ?
      ORDER BY wp.week_start_date,
        CASE wp.day_of_week
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
        END
    `, [weekStartFirst, weekStartLast]);

    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /weeklyplanner - Create or update weekly plan
router.post('/', async (req, res) => {
  try {
    const { week_start_date, day_of_week, workout_id, warmup_id, cooldown_id } = req.body;

    if (!week_start_date || !day_of_week || !workout_id) {
      return res.status(400).json({ error: 'week_start_date, day_of_week, and workout_id are required' });
    }

    // Verify workout exists
    const workout = await dbGet('SELECT workout_id FROM workouts WHERE workout_id = ?', [workout_id]);
    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    // Verify warmup and cooldown if provided
    if (warmup_id) {
      const warmup = await dbGet('SELECT workout_id FROM workouts WHERE workout_id = ? AND type = ?', [warmup_id, 'warmup']);
      if (!warmup) {
        return res.status(404).json({ error: 'Warmup not found' });
      }
    }

    if (cooldown_id) {
      const cooldown = await dbGet('SELECT workout_id FROM workouts WHERE workout_id = ? AND type = ?', [cooldown_id, 'cooldown']);
      if (!cooldown) {
        return res.status(404).json({ error: 'Cooldown not found' });
      }
    }

    // Insert or replace
    try {
      await dbRun(`
        INSERT OR REPLACE INTO weekly_planner 
          (week_start_date, day_of_week, workout_id, warmup_id, cooldown_id, completed)
        VALUES (?, ?, ?, ?, ?, 0)
      `, [week_start_date, day_of_week, workout_id, warmup_id || null, cooldown_id || null]);
    } catch (dbError) {
      console.error('Database error saving weekly plan:', dbError);
      return res.status(500).json({ error: 'Database error: ' + dbError.message });
    }

    const planItem = await dbGet(`
      SELECT 
        wp.*,
        w.title as workout_title,
        w.video_url as workout_url,
        w.duration_min,
        w.intensity,
        w.primary_target,
        w.channel_name,
        wm.title as warmup_title,
        wm.video_url as warmup_url,
        wc.title as cooldown_title,
        wc.video_url as cooldown_url
      FROM weekly_planner wp
      JOIN workouts w ON wp.workout_id = w.workout_id
      LEFT JOIN workouts wm ON wp.warmup_id = wm.workout_id
      LEFT JOIN workouts wc ON wp.cooldown_id = wc.workout_id
      WHERE wp.week_start_date = ? AND wp.day_of_week = ?
    `, [week_start_date, day_of_week]);

    res.status(201).json(planItem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /weeklyplanner/:id - Update plan item (e.g., mark as completed)
router.patch('/:id', async (req, res) => {
  try {
    const { completed } = req.body;

    if (completed !== undefined) {
      await dbRun('UPDATE weekly_planner SET completed = ? WHERE id = ?', [completed ? 1 : 0, req.params.id]);
    }

    const planItem = await dbGet(`
      SELECT 
        wp.*,
        w.title as workout_title,
        w.video_url as workout_url,
        w.duration_min,
        w.intensity,
        w.primary_target,
        w.channel_name,
        wm.title as warmup_title,
        wm.video_url as warmup_url,
        wc.title as cooldown_title,
        wc.video_url as cooldown_url
      FROM weekly_planner wp
      JOIN workouts w ON wp.workout_id = w.workout_id
      LEFT JOIN workouts wm ON wp.warmup_id = wm.workout_id
      LEFT JOIN workouts wc ON wp.cooldown_id = wc.workout_id
      WHERE wp.id = ?
    `, [req.params.id]);

    if (!planItem) {
      return res.status(404).json({ error: 'Plan item not found' });
    }

    res.json(planItem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /weeklyplanner/current - Clear current week
router.delete('/current', async (req, res) => {
  try {
    const weekStart = getWeekStart();
    const result = await dbRun('DELETE FROM weekly_planner WHERE week_start_date = ?', [weekStart]);
    res.json({ message: `Current week (${weekStart}) cleared successfully`, deleted: result.changes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /weeklyplanner/:id - Delete plan item
router.delete('/:id', async (req, res) => {
  try {
    const result = await dbRun('DELETE FROM weekly_planner WHERE id = ?', [req.params.id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Plan item not found' });
    }
    res.json({ message: 'Plan item deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

