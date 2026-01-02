import express from 'express';
import cors from 'cors';
import { initDatabase } from './db.js';
import workoutRoutes from './routes/workouts.js';
import recommendationRoutes from './routes/recommendation.js';
import historyRoutes from './routes/history.js';
import importRoutes from './routes/import.js';
import watchLaterRoutes from './routes/watchlater.js';
import weeklyPlannerRoutes from './routes/weeklyplanner.js';
import favoritesRoutes from './routes/favorites.js';
import playlistsRoutes from './routes/playlists.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize database
await initDatabase();

// Routes
app.use('/workouts', workoutRoutes);
app.use('/recommendation', recommendationRoutes);
app.use('/history', historyRoutes);
app.use('/import', importRoutes);
app.use('/watchlater', watchLaterRoutes);
app.use('/weeklyplanner', weeklyPlannerRoutes);
app.use('/favorites', favoritesRoutes);
app.use('/playlists', playlistsRoutes);

app.get('/', (req, res) => {
  res.json({ 
    message: 'YouTubeFit API',
    version: '1.0.0',
    endpoints: {
      workouts: '/workouts',
      recommendation: '/recommendation/today',
      history: '/history',
      import: '/import',
      watchLater: '/watchlater',
      weeklyPlanner: '/weeklyplanner',
      favorites: '/favorites',
      playlists: '/playlists',
      health: '/health'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Catch-all for undefined routes
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    method: req.method,
    availableEndpoints: {
      workouts: '/workouts',
      recommendation: '/recommendation/today',
      history: '/history',
      import: '/import',
      watchLater: '/watchlater',
      weeklyPlanner: '/weeklyplanner',
      favorites: '/favorites',
      playlists: '/playlists',
      health: '/health'
    }
  });
});

const HOST = process.env.HOST || 'localhost'; // Use '0.0.0.0' for network access

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  if (HOST === '0.0.0.0') {
    console.log(`\n⚠️  Server is accessible on your network!`);
    console.log(`   Access from other devices: http://YOUR_IP:${PORT}`);
    console.log(`   To restrict access, use firewall rules or bind to 'localhost'\n`);
  }
});

