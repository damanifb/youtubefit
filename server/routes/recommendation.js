import express from 'express';
import { dbAll, dbGet } from '../db.js';

const router = express.Router();

/**
 * Calculate recommendation score for a workout
 */
function calculateScore(workout, historyStats, filters) {
  let score = 100;

  // Penalize by completion count
  const countCompleted = historyStats.count_completed || 0;
  score -= countCompleted * 10;

  // Bonus for target match
  if (filters.primary_target) {
    if (workout.primary_target === filters.primary_target) {
      score += 15;
    } else if (workout.target_tag1 === filters.primary_target || workout.target_tag2 === filters.primary_target) {
      score += 5;
    }
  }

  // Bonus for rating
  if (workout.rating) {
    score += workout.rating * 2;
  }

  return score;
}

/**
 * Get history statistics for a workout
 */
async function getHistoryStats(workoutId) {
  const stats = await dbGet(`
    SELECT 
      COUNT(*) as count_completed,
      MIN(date) as first_attempt_date,
      MAX(date) as last_done_date
    FROM workout_history
    WHERE workout_id = ?
  `, [workoutId]);

  return {
    count_completed: stats?.count_completed || 0,
    first_attempt_date: stats?.first_attempt_date || null,
    last_done_date: stats?.last_done_date || null
  };
}

/**
 * Check if workout is within cooldown period
 */
async function isWithinCooldown(workoutId, repeatCooldownDays) {
  if (repeatCooldownDays <= 0) return false;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - repeatCooldownDays);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

  const recent = await dbGet(`
    SELECT COUNT(*) as count
    FROM workout_history
    WHERE workout_id = ? AND date >= ?
  `, [workoutId, cutoffDateStr]);

  return (recent?.count || 0) > 0;
}

// Helper function to check if workout is Yoga
function isYogaWorkout(workout) {
  const title = workout.title?.toLowerCase() || '';
  const channel = workout.channel_name?.toLowerCase() || '';
  return title.includes('yoga') || 
         channel.includes('yoga') || 
         channel.includes('adriene') ||
         channel.includes('nancy');
}

// GET /recommendation/today - Get workout recommendation
router.get('/today', async (req, res) => {
  try {
    const {
      target,
      duration_min,
      duration_max,
      intensity,
      equipment,
      yoga,
      special_tag,
      channels
    } = req.query;

    // Build base query for workouts
    let sql = `
      SELECT * FROM workouts
      WHERE vetted = 1
        AND do_not_recommend = 0
        AND link_status = 'ok'
    `;
    const params = [];

    // If yoga is requested, filter for yoga workouts (type='yoga' or yoga keywords)
    if (yoga === 'true' || yoga === '1') {
      sql += ` AND (
        type = 'yoga'
        OR LOWER(title) LIKE '%yoga%' 
        OR LOWER(channel_name) LIKE '%yoga%'
        OR LOWER(channel_name) LIKE '%adriene%'
        OR LOWER(channel_name) LIKE '%nancy%'
      )`;
    } else {
      // Exclude yoga workouts when not specifically requested
      sql += ` AND type = 'workout'`;
    }
    
    // Apply target filter if provided and not yoga
    if (target && target.trim() !== '' && yoga !== 'true' && yoga !== '1') {
      sql += ' AND (primary_target = ? OR target_tag1 = ? OR target_tag2 = ?)';
      params.push(target, target, target);
    }

    // Apply special tag filter if provided (searches target_tag1 and target_tag2)
    if (special_tag && special_tag.trim() !== '' && yoga !== 'true' && yoga !== '1') {
      sql += ' AND (target_tag1 = ? OR target_tag2 = ?)';
      params.push(special_tag, special_tag);
    }

    // Apply channel filter if provided (comma-separated list of channel names)
    if (channels && channels.trim() !== '' && yoga !== 'true' && yoga !== '1') {
      const channelList = channels.split(',').map(c => c.trim()).filter(c => c);
      if (channelList.length > 0) {
        const placeholders = channelList.map(() => '?').join(',');
        sql += ` AND channel_name IN (${placeholders})`;
        params.push(...channelList);
      }
    }

    if (duration_min && duration_min.trim() !== '') {
      sql += ' AND duration_min >= ?';
      params.push(parseInt(duration_min, 10));
    }

    if (duration_max && duration_max.trim() !== '') {
      sql += ' AND duration_min <= ?';
      params.push(parseInt(duration_max, 10));
    }

    if (intensity && intensity.trim() !== '') {
      sql += ' AND intensity = ?';
      params.push(intensity);
    }

    if (equipment && equipment.trim() !== '') {
      sql += ' AND equipment = ?';
      params.push(equipment);
    }

    const candidateWorkouts = await dbAll(sql, params);

    // Filter out workouts within cooldown period and calculate scores
    const scoredWorkouts = [];
    for (const workout of candidateWorkouts) {
      const withinCooldown = await isWithinCooldown(workout.workout_id, workout.repeat_cooldown_days);
      if (withinCooldown) continue;

      const historyStats = await getHistoryStats(workout.workout_id);
      const score = calculateScore(workout, historyStats, { primary_target: target });
      
      scoredWorkouts.push({
        ...workout,
        score,
        history_stats: historyStats
      });
    }

    if (scoredWorkouts.length === 0) {
      const errorMsg = yoga === 'true' || yoga === '1' 
        ? 'No yoga workouts found matching your criteria. Try adjusting duration filters.'
        : 'No workouts match the criteria. Try adjusting your filters.';
      return res.status(404).json({ error: errorMsg });
    }

    // Sort by score (descending)
    scoredWorkouts.sort((a, b) => b.score - a.score);

    // Use a larger pool for more variety - take top 30 or 50% of available workouts, whichever is larger
    const poolSize = Math.max(30, Math.floor(scoredWorkouts.length * 0.5));
    const topWorkouts = scoredWorkouts.slice(0, Math.min(poolSize, scoredWorkouts.length));

    // Use weighted random selection for more variety while still favoring higher scores
    // Higher scores get exponentially more weight, but lower scores still have a chance
    const maxScore = topWorkouts[0]?.score || 100;
    const minScore = topWorkouts[topWorkouts.length - 1]?.score || 0;
    const scoreRange = maxScore - minScore || 1;

    // Calculate weights: higher scores get exponentially more weight
    const weights = topWorkouts.map(workout => {
      // Normalize score to 0-1 range, then square it to favor higher scores more
      const normalizedScore = (workout.score - minScore) / scoreRange;
      // Square it to create exponential weighting, then add 0.1 to ensure even lowest scores have some chance
      return Math.pow(normalizedScore, 1.5) + 0.1;
    });

    // Calculate total weight
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

    // Select workout using weighted random
    let random = Math.random() * totalWeight;
    let selectedWorkout = topWorkouts[0]; // fallback to first
    for (let i = 0; i < topWorkouts.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        selectedWorkout = topWorkouts[i];
        break;
      }
    }

    // Check if selected workout is Yoga - if so, skip warmup/cooldown
    const isYoga = isYogaWorkout(selectedWorkout) || (yoga === 'true' || yoga === '1');

    // Find matching warmup (skip for Yoga)
    let warmup = null;
    if (!isYoga) {
      const warmupCandidates = await dbAll(`
        SELECT * FROM workouts
        WHERE type = 'warmup'
          AND vetted = 1
          AND do_not_recommend = 0
          AND link_status = 'ok'
          AND (primary_target = ? OR primary_target = 'Full Body')
        ORDER BY duration_min ASC
        LIMIT 5
      `, [selectedWorkout.primary_target]);

      if (warmupCandidates.length > 0) {
        warmup = warmupCandidates[Math.floor(Math.random() * warmupCandidates.length)];
      }
    }

    // Find matching cooldown (skip for Yoga)
    let cooldown = null;
    if (!isYoga) {
      const cooldownCandidates = await dbAll(`
        SELECT * FROM workouts
        WHERE type = 'cooldown'
          AND vetted = 1
          AND do_not_recommend = 0
          AND link_status = 'ok'
          AND (primary_target = ? OR primary_target = 'Full Body')
        ORDER BY duration_min ASC
        LIMIT 5
      `, [selectedWorkout.primary_target]);

      if (cooldownCandidates.length > 0) {
        cooldown = cooldownCandidates[Math.floor(Math.random() * cooldownCandidates.length)];
      }
    }

    res.json({
      workout: selectedWorkout,
      warmup,
      cooldown
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /recommendation/warmup-cooldown/:workout_id - Get warmup/cooldown for a specific workout
router.get('/warmup-cooldown/:workout_id', async (req, res) => {
  try {
    const { workout_id } = req.params;

    // Get the workout
    const workout = await dbGet('SELECT * FROM workouts WHERE workout_id = ?', [workout_id]);
    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    // Check if it's a yoga workout
    const isYoga = isYogaWorkout(workout);
    if (isYoga) {
      return res.json({ warmup: null, cooldown: null });
    }

    // Find matching warmup
    let warmup = null;
    const warmupCandidates = await dbAll(`
      SELECT * FROM workouts
      WHERE type = 'warmup'
        AND vetted = 1
        AND do_not_recommend = 0
        AND link_status = 'ok'
        AND (primary_target = ? OR primary_target = 'Full Body')
      ORDER BY duration_min ASC
      LIMIT 5
    `, [workout.primary_target]);

    if (warmupCandidates.length > 0) {
      warmup = warmupCandidates[Math.floor(Math.random() * warmupCandidates.length)];
    }

    // Find matching cooldown
    let cooldown = null;
    const cooldownCandidates = await dbAll(`
      SELECT * FROM workouts
      WHERE type = 'cooldown'
        AND vetted = 1
        AND do_not_recommend = 0
        AND link_status = 'ok'
        AND (primary_target = ? OR primary_target = 'Full Body')
      ORDER BY duration_min ASC
      LIMIT 5
    `, [workout.primary_target]);

    if (cooldownCandidates.length > 0) {
      cooldown = cooldownCandidates[Math.floor(Math.random() * cooldownCandidates.length)];
    }

    res.json({ warmup, cooldown });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

