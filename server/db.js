import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '..', 'youtubefit.db');

let db;

export function getDb() {
  if (!db) {
    db = new sqlite3.Database(DB_PATH);
  }
  return db;
}

// Promisify database methods
export function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export async function initDatabase() {
  const db = getDb();
  
  // Update existing schema to allow 'yoga' type (if table exists, this will be a no-op for the CHECK constraint)
  // We'll update existing yoga workouts separately
  try {
    // First, update any existing yoga workouts that might be marked as 'workout'
    await dbRun(`
      UPDATE workouts 
      SET type = 'yoga' 
      WHERE (
        LOWER(title) LIKE '%yoga%' 
        OR LOWER(channel_name) LIKE '%yoga%'
        OR LOWER(channel_name) LIKE '%adriene%'
        OR LOWER(channel_name) LIKE '%nancy%'
      ) AND type = 'workout'
    `);
  } catch (error) {
    // If table doesn't exist yet, that's fine - it will be created below
    console.log('Note: Could not update existing yoga workouts (table may not exist yet)');
  }
  
  // Create workouts table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS workouts (
      workout_id TEXT PRIMARY KEY,
      yt_id TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      channel_name TEXT NOT NULL,
      channel_code TEXT,
      video_url TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('workout', 'warmup', 'cooldown', 'yoga')),
      primary_target TEXT NOT NULL,
      target_tag1 TEXT,
      target_tag2 TEXT,
      intensity TEXT NOT NULL CHECK(intensity IN ('low', 'medium', 'high')),
      duration_min INTEGER NOT NULL,
      equipment TEXT NOT NULL CHECK(equipment IN ('none', 'bands', 'dumbbells', 'other')),
      vetted INTEGER NOT NULL DEFAULT 0 CHECK(vetted IN (0, 1)),
      do_not_recommend INTEGER NOT NULL DEFAULT 0 CHECK(do_not_recommend IN (0, 1)),
      rating INTEGER CHECK(rating IN (1, 2, 3, 4)),
      repeat_cooldown_days INTEGER NOT NULL DEFAULT 5,
      link_status TEXT NOT NULL DEFAULT 'ok' CHECK(link_status IN ('ok', 'suspected', 'dead', 'private')),
      last_checked TEXT,
      notes TEXT
    )
  `);

  // Add notes column if it doesn't exist (for existing databases)
  try {
    await dbRun(`ALTER TABLE workouts ADD COLUMN notes TEXT`);
  } catch (error) {
    // Column already exists, ignore error
  }

  // Create index on yt_id for faster lookups
  await dbRun(`
    CREATE INDEX IF NOT EXISTS idx_yt_id ON workouts(yt_id)
  `);

  // Create index on type for filtering
  await dbRun(`
    CREATE INDEX IF NOT EXISTS idx_type ON workouts(type)
  `);

  // Create workout_history table (append-only)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS workout_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      workout_id TEXT NOT NULL,
      warmup_id TEXT,
      cooldown_id TEXT,
      notes TEXT,
      FOREIGN KEY (workout_id) REFERENCES workouts(workout_id),
      FOREIGN KEY (warmup_id) REFERENCES workouts(workout_id),
      FOREIGN KEY (cooldown_id) REFERENCES workouts(workout_id)
    )
  `);

  // Add notes column if it doesn't exist (for existing databases)
  try {
    await dbRun(`ALTER TABLE workout_history ADD COLUMN notes TEXT`);
  } catch (error) {
    // Column already exists, ignore error
  }

  // Create index on date for history queries
  await dbRun(`
    CREATE INDEX IF NOT EXISTS idx_history_date ON workout_history(date)
  `);

  // Create index on workout_id for history queries
  await dbRun(`
    CREATE INDEX IF NOT EXISTS idx_history_workout_id ON workout_history(workout_id)
  `);

  // Create watch_later table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS watch_later (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_id TEXT NOT NULL,
      added_date TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (workout_id) REFERENCES workouts(workout_id),
      UNIQUE(workout_id)
    )
  `);

  // Create index on workout_id for watch_later
  await dbRun(`
    CREATE INDEX IF NOT EXISTS idx_watch_later_workout_id ON watch_later(workout_id)
  `);

  // Create weekly_planner table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS weekly_planner (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start_date TEXT NOT NULL,
      day_of_week TEXT NOT NULL CHECK(day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')),
      workout_id TEXT NOT NULL,
      warmup_id TEXT,
      cooldown_id TEXT,
      completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0, 1)),
      FOREIGN KEY (workout_id) REFERENCES workouts(workout_id),
      FOREIGN KEY (warmup_id) REFERENCES workouts(workout_id),
      FOREIGN KEY (cooldown_id) REFERENCES workouts(workout_id),
      UNIQUE(week_start_date, day_of_week)
    )
  `);

  // Create index on week_start_date for weekly_planner
  await dbRun(`
    CREATE INDEX IF NOT EXISTS idx_weekly_planner_week_start ON weekly_planner(week_start_date)
  `);

  // Create favorites table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_id TEXT NOT NULL,
      added_date TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (workout_id) REFERENCES workouts(workout_id),
      UNIQUE(workout_id)
    )
  `);

  // Create index on workout_id for favorites
  await dbRun(`
    CREATE INDEX IF NOT EXISTS idx_favorites_workout_id ON favorites(workout_id)
  `);

  // Create playlists table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      week_start_date TEXT NOT NULL,
      created_date TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(name, week_start_date)
    )
  `);

  // Create index on week_start_date for playlists
  await dbRun(`
    CREATE INDEX IF NOT EXISTS idx_playlists_week_start ON playlists(week_start_date)
  `);

  console.log('Database initialized');
}

