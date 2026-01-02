import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { importWorkoutsFromCSV, importHistoryFromCSV } from '../import.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// POST /import/csv - Import workouts from CSV
router.post('/csv', async (req, res) => {
  try {
    const { file } = req.body;
    
    // Default to workouts.csv in project root
    const filePath = file || join(__dirname, '..', '..', 'workouts.csv');
    
    const result = await importWorkoutsFromCSV(filePath);
    
    res.json({
      message: 'Import completed',
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors.length > 0 ? result.errors : undefined
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /import/history - Import history from CSV
router.post('/history', async (req, res) => {
  try {
    const { file } = req.body;
    
    // Default to history.csv in project root
    const filePath = file || join(__dirname, '..', '..', 'history.csv');
    
    const result = await importHistoryFromCSV(filePath);
    
    res.json({
      message: 'History import completed',
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors.length > 0 ? result.errors : undefined
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

