import { initDatabase } from '../db.js';
import { importWorkoutsFromCSV, importHistoryFromCSV } from '../import.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');

async function main() {
  console.log('Initializing database...');
  await initDatabase();

  console.log('\nImporting workouts from CSV...');
  const workoutsPath = join(projectRoot, 'workouts.csv');
  const workoutsResult = await importWorkoutsFromCSV(workoutsPath);
  console.log(`Imported: ${workoutsResult.imported}, Skipped: ${workoutsResult.skipped}`);
  if (workoutsResult.errors.length > 0) {
    console.log('Errors:', workoutsResult.errors.slice(0, 5));
  }

  console.log('\nImporting history from CSV...');
  const historyPath = join(projectRoot, 'history.csv');
  const historyResult = await importHistoryFromCSV(historyPath);
  console.log(`Imported: ${historyResult.imported}, Skipped: ${historyResult.skipped}`);
  if (historyResult.errors.length > 0) {
    console.log('Errors:', historyResult.errors.slice(0, 5));
  }

  console.log('\nImport complete!');
  process.exit(0);
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});

