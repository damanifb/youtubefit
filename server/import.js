import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { dbRun, dbGet, dbAll } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Extract YouTube video ID from various URL formats
 */
function extractYTId(url) {
  if (!url) return null;
  
  // Handle full URLs
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/ // Already just the ID
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

/**
 * Extract channel code from Workout_ID (e.g., YF-FM04 -> FM)
 */
function extractChannelCode(workoutId) {
  if (!workoutId) return null;
  const match = workoutId.match(/^YF-([A-Z]+)/);
  return match ? match[1] : null;
}

/**
 * Normalize type: "Workout", "Warmup", "Cooldown", "Yoga" -> "workout", "warmup", "cooldown", "yoga"
 */
function normalizeType(type) {
  if (!type) return 'workout';
  const lower = type.toLowerCase();
  if (lower === 'yoga') return 'yoga';
  if (lower === 'warmup') return 'warmup';
  if (lower === 'cooldown') return 'cooldown';
  return 'workout';
}

/**
 * Normalize intensity
 */
function normalizeIntensity(intensity) {
  if (!intensity) return 'medium';
  return intensity.toLowerCase();
}

/**
 * Normalize equipment
 */
function normalizeEquipment(equipment) {
  if (!equipment) return 'none';
  const lower = equipment.toLowerCase();
  if (lower === 'none' || lower === 'mat' || lower === 'bands' || lower === 'dumbbells') {
    return lower;
  }
  return 'other';
}

/**
 * Normalize boolean (Y/N -> 1/0)
 */
function normalizeBoolean(value) {
  if (!value) return 0;
  const upper = value.toString().toUpperCase();
  return upper === 'Y' ? 1 : 0;
}

/**
 * Normalize link status
 */
function normalizeLinkStatus(status) {
  if (!status) return 'ok';
  return status.toLowerCase();
}

/**
 * Parse rating (empty string -> null, otherwise parse as integer)
 */
function parseRating(rating) {
  if (!rating || rating.trim() === '') return null;
  const num = parseInt(rating, 10);
  return (num >= 1 && num <= 4) ? num : null;
}

/**
 * Parse date from MM/DD/YY format to ISO format
 */
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  // Handle MM/DD/YY format
  const match = dateStr.match(/(\d+)\/(\d+)\/(\d+)/);
  if (match) {
    const [, month, day, year] = match;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return dateStr; // Already in ISO format or invalid
}

/**
 * Generate Workout_ID if missing
 */
async function generateWorkoutId(channelCode) {
  if (!channelCode) channelCode = 'UNK';
  
  // Find the highest number for this channel
  const result = await dbGet(
    `SELECT workout_id FROM workouts 
     WHERE workout_id LIKE ? 
     ORDER BY workout_id DESC LIMIT 1`,
    [`YF-${channelCode}%`]
  );
  
  if (result) {
    const match = result.workout_id.match(/\d+$/);
    if (match) {
      const num = parseInt(match[0], 10);
      const nextNum = (num + 1).toString().padStart(2, '0');
      return `YF-${channelCode}${nextNum}`;
    }
  }
  
  return `YF-${channelCode}01`;
}

export async function importWorkoutsFromCSV(filePath) {
  const csvContent = readFileSync(filePath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  let imported = 0;
  let skipped = 0;
  const errors = [];

  for (const record of records) {
    try {
      // Extract YT_ID from video URL
      let ytId = record.YT_ID;
      if (!ytId || ytId.trim() === '') {
        ytId = extractYTId(record.Video_URL);
      } else {
        // Clean up YT_ID if it has extra characters
        ytId = ytId.trim();
      }

      if (!ytId) {
        errors.push(`Row missing YT_ID: ${JSON.stringify(record)}`);
        skipped++;
        continue;
      }

      // Check for duplicate by YT_ID
      const existingByYT = await dbGet('SELECT workout_id FROM workouts WHERE yt_id = ?', [ytId]);
      if (existingByYT) {
        skipped++;
        continue; // Skip duplicates by YT_ID
      }

      // Generate or use Workout_ID
      let workoutId = record.Workout_ID;
      if (!workoutId || workoutId.trim() === '') {
        // Try to extract channel code from various sources
        let channelCode = extractChannelCode(record.Workout_ID);
        if (!channelCode) {
          // Try to extract from channel URL
          const channelMatch = record.Channel_URL?.match(/@([^/]+)/);
          if (channelMatch) {
            // Use first few letters of channel name as code
            const channelName = channelMatch[1].toUpperCase().replace(/[^A-Z]/g, '').substring(0, 2);
            channelCode = channelName || 'UNK';
          } else {
            channelCode = 'UNK';
          }
        }
        workoutId = await generateWorkoutId(channelCode);
      } else {
        workoutId = workoutId.trim();
        // Check if Workout_ID already exists (but with different YT_ID)
        const existingById = await dbGet('SELECT workout_id FROM workouts WHERE workout_id = ?', [workoutId]);
        if (existingById) {
          // Generate a new Workout_ID to avoid conflict
          const channelCode = extractChannelCode(workoutId) || 'UNK';
          workoutId = await generateWorkoutId(channelCode);
        }
      }

      // Extract channel code
      const channelCode = extractChannelCode(workoutId);

      // Prepare data
      const workoutData = {
        workout_id: workoutId,
        yt_id: ytId,
        title: record.Workout_Title || record.YT_Title || 'Untitled',
        channel_name: record.Uploader_Name || 'Unknown',
        channel_code: channelCode,
        video_url: record.Video_URL || `https://www.youtube.com/watch?v=${ytId}`,
        type: normalizeType(record.Type),
        primary_target: record.Primary_Target || 'Full Body',
        target_tag1: record.Target_Tag1 || null,
        target_tag2: record.Target_Tag2 || null,
        intensity: normalizeIntensity(record.Intensity),
        duration_min: parseInt(record.Duration_Min, 10) || 0,
        equipment: normalizeEquipment(record.Equipment),
        vetted: normalizeBoolean(record.Vetted),
        do_not_recommend: normalizeBoolean(record.Do_Not_Recommend),
        rating: parseRating(record.Rating),
        repeat_cooldown_days: parseInt(record.Repeat_Cooldown_Days, 10) || 5,
        link_status: normalizeLinkStatus(record.Link_Status),
        last_checked: parseDate(record.Last_Checked)
      };

      // Insert into database
      await dbRun(`
        INSERT INTO workouts (
          workout_id, yt_id, title, channel_name, channel_code, video_url,
          type, primary_target, target_tag1, target_tag2,
          intensity, duration_min, equipment,
          vetted, do_not_recommend, rating, repeat_cooldown_days,
          link_status, last_checked
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        workoutData.workout_id,
        workoutData.yt_id,
        workoutData.title,
        workoutData.channel_name,
        workoutData.channel_code,
        workoutData.video_url,
        workoutData.type,
        workoutData.primary_target,
        workoutData.target_tag1,
        workoutData.target_tag2,
        workoutData.intensity,
        workoutData.duration_min,
        workoutData.equipment,
        workoutData.vetted,
        workoutData.do_not_recommend,
        workoutData.rating,
        workoutData.repeat_cooldown_days,
        workoutData.link_status,
        workoutData.last_checked
      ]);

      imported++;
    } catch (error) {
      errors.push(`Error importing row: ${error.message} - ${JSON.stringify(record)}`);
      skipped++;
    }
  }

  return { imported, skipped, errors };
}

export async function importHistoryFromCSV(filePath) {
  const csvContent = readFileSync(filePath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  let imported = 0;
  let skipped = 0;
  const errors = [];

  for (const record of records) {
    try {
      if (!record.Date || !record.Workout_ID) {
        errors.push(`Row missing required fields: ${JSON.stringify(record)}`);
        skipped++;
        continue;
      }

      // Parse date (assume ISO format or convert)
      let date = record.Date;
      if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        date = parseDate(date);
        if (!date) {
          errors.push(`Invalid date format: ${record.Date}`);
          skipped++;
          continue;
        }
      }

      // Verify workout exists
      const workout = await dbGet('SELECT workout_id FROM workouts WHERE workout_id = ?', [record.Workout_ID]);
      if (!workout) {
        errors.push(`Workout not found: ${record.Workout_ID}`);
        skipped++;
        continue;
      }

      // Verify warmup and cooldown if provided
      if (record.Warmup_ID) {
        const warmup = await dbGet('SELECT workout_id FROM workouts WHERE workout_id = ?', [record.Warmup_ID]);
        if (!warmup) {
          errors.push(`Warmup not found: ${record.Warmup_ID}`);
          skipped++;
          continue;
        }
      }

      if (record.Cooldown_ID) {
        const cooldown = await dbGet('SELECT workout_id FROM workouts WHERE workout_id = ?', [record.Cooldown_ID]);
        if (!cooldown) {
          errors.push(`Cooldown not found: ${record.Cooldown_ID}`);
          skipped++;
          continue;
        }
      }

      // Insert history record
      await dbRun(`
        INSERT INTO workout_history (date, workout_id, warmup_id, cooldown_id)
        VALUES (?, ?, ?, ?)
      `, [
        date,
        record.Workout_ID,
        record.Warmup_ID || null,
        record.Cooldown_ID || null
      ]);

      imported++;
    } catch (error) {
      errors.push(`Error importing history row: ${error.message} - ${JSON.stringify(record)}`);
      skipped++;
    }
  }

  return { imported, skipped, errors };
}

