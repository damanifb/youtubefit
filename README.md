# YouTubeFit 🏋️

A personal fitness companion web app that helps you discover, plan, and track YouTube workout videos. Build custom workout weeks, create playlists, and maintain a complete history of your fitness journey.

## 🎯 Features

### 📚 Smart Library Management

- **Exercise Library** - Browse 3,000+ YouTube workouts with advanced filtering
- **Favorites** - Bookmark your go-to workouts for quick access
- **Watch Later** - Queue workouts you want to try
- **Filters** - Type (workout/yoga/warmup/cooldown), intensity, target area, equipment, trainer, and vetted status

### 📅 Weekly Planning

- **Build My Week** - Plan your weekly workout schedule with three modes:
  - **Simple** - Quick type and intensity selection
  - **Basic** - Add intensity and target area preferences
  - **Advanced** - Full control with all filters
- **Auto-generate** - Get AI recommendations based on your preferences
- **Rest Days** - Workouts without selections automatically marked as rest days

### 📊 This Week Dashboard

- **Week Overview** - Visual grid of your planned workouts
- **Quick Access** - Start any day's workout with one click
- **Save as Playlist** - Create reusable weekly schedules
- **Load Playlists** - Apply saved plans to any week

### 📈 Tracking & History

- **Workout Logging** - Mark workouts as complete, view history
- **Monthly Calendar** - See your fitness activity across 30 days
- **Home Dashboard** - Pick a workout for today with smart recommendations

### 👥 Trainer Directory

- Browse all available trainers alphabetically
- View total workout count per trainer
- Direct links to YouTube channels

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org))
- **npm** (included with Node.js)

### Installation

1. **Clone and navigate:**

```bash
git clone https://github.com/yourusername/youtubefit.git
cd youtubefit
```

1. **Install dependencies:**

```bash
npm install
```

This installs all required packages including SQLite, React, Vite, and Express.

1. **Start the application:**

```bash
npm run start:all
```

This starts both backend and frontend servers concurrently.

1. **Open in browser:**

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3001`

The database will be created automatically on first run, and starter CSV data will be imported.

### One-Command Startup

```bash
npm run start:all
```

Launches:

- Backend server on port 3001
- Frontend dev server on port 3000
- Automatic database initialization
- CSV data import

## 📖 Usage Guide

### 🏠 Home Dashboard

Pick a workout for today with smart recommendations. Use filters to narrow results:

- **Type** - Workout, Yoga, or paired Warmup/Cooldown
- **Target Area** - Full Body, Upper, Lower, Core, Cardio
- **Intensity** - Low, Medium, High
- **Equipment** - None, Bands, Dumbbells

Click **"Do Now!"** to start immediately or save it for later.

### 📚 Exercise Library

Three tabs for workout management:

#### Exercise Library Tab

- Browse all 3,000+ workouts
- Use filters to find workouts matching your preferences
- Notes display inline with each workout
- Edit workout ratings and metadata
- Add to your week directly from cards

#### Favorites Tab

- Your bookmarked workouts
- Video preview and YouTube link
- Quick "Do Now!" access
- Full editing capabilities

#### Watch Later Tab

- Queue for future workouts
- Same features as Favorites
- Move to your week when ready

### 📅 Build My Week

Plan your entire week with three modes. Switch modes with tabs at the top.

#### Simple Mode

Fast planning:

- Select type (Workout/Yoga)
- Choose intensity level
- Generate week

#### Basic Mode

Standard planning:

- Type, Intensity, Target Area
- Equipment preferences
- Generate based on selections

#### Advanced Mode

Full control:

- All available filters
- Most granular control
- Create highly specific weeks

#### Workflow

1. Set your preferences for the week
2. Click **"Generate Week"** (all filters apply to all days)
3. OR click individual day's **Generate** to override specific days
4. Days without workouts become Rest Days
5. Click **"Create Playlist"** to save the week for reuse

#### Day Management

- Click **×** to clear all selections for a day
- Mark day as Rest Day (removes workout)
- Jump to This Week view to see your plan

### 📊 This Week

View and manage your planned week.

#### Features

- Date picker to jump to any week
- Visual grid showing all 7 days
- Click any day to start that workout
- Mark workouts complete (✓ button)
- Remove workouts (× button)
- **Save to Playlist** - Name and save the current week
- **Load Playlist** - Apply a saved week

#### Controls

- Green checkmark = completed
- X button = remove workout
- Day card styling = rest day (dashed border) vs. planned (solid border)

### 📈 History & Tracking

View your complete workout history:

- Chronological list of all completed workouts
- Workout details (date, title, duration, trainer)
- Filter by month with navigation

### 👥 Trainers Page

Browse all available trainers:

- Alphabetically sorted
- Profile pictures and names
- Total workout count per trainer
- Direct YouTube channel links

### ⚙️ Settings

- **Dark Mode** - Toggle between light and dark themes (affects logo display)
- App preferences (future expansion)

## 🛠️ Technical Setup

### Ports & Configuration

- **Frontend Dev Server**: Port 3000 (auto-fallback if in use)
- **Backend API Server**: Port 3001 (auto-fallback if in use)
- **Database**: `youtubefit.db` (created in project root)

### File Structure

```
youtubefit/
├── public/
│   └── img/
│       ├── logos/          # Brand logos
│       └── trainers/       # Trainer profile images
├── src/
│   ├── components/         # React components (Today, Library, BuildMyWeek, etc.)
│   ├── utils/              # Utilities (toast notifications, etc.)
│   ├── api.js              # API client
│   ├── App.jsx             # Main app
│   └── index.css           # Global styles
├── server/
│   ├── index.js            # Express server
│   ├── db.js               # SQLite database
│   ├── import.js           # CSV import logic
│   ├── routes/             # API endpoints
│   └── scripts/            # Utility scripts
├── workouts.csv            # Starter workout data
├── history.csv             # Starter history data (optional)
├── channels.csv            # Trainer/channel data
└── package.json            # Dependencies
```

### Important Files

- **workouts.csv** - Required. Contains all workout definitions
- **channels.csv** - Trainer/channel information (auto-created if missing)
- **youtubefit.db** - SQLite database (auto-created on first run)

## 📝 Adding New Workouts

### Manual Addition

1. Open **Library** → **Exercise Library**
2. Bulk import via CSV (see below) for efficiency

### CSV Import

1. Prepare CSV with columns: `id, title, channel_name, video_url, type, primary_target, intensity, duration_min, equipment, notes`
2. Place in project root as `workouts.csv`
3. Run: `npm run import`
4. Restart the app

### CSV Format Example

```csv
id,title,channel_name,video_url,type,primary_target,intensity,duration_min,equipment
YF-001,30 Min Full Body HIIT,Caroline Girvan,https://youtu.be/abc123,workout,Full Body,high,30,none
YF-002,Beginner Yoga,Yoga With Adriene,https://youtu.be/def456,yoga,Full Body,low,20,mat
```

## 👥 Adding New Trainers

1. **Add trainer to channels.csv** (project root):

```csv
channel_name,url,notes
New Trainer Name,https://youtube.com/@handle,Optional notes
```

1. **Add trainer image** (optional, for profile display):

```
public/img/trainers/{TrainerName}.jpg
```

Recommended size: 300x300px or larger

1. **Restart the app**
   - Trainer appears in Trainers page (alphabetically sorted)
   - Available in all filter dropdowns

## 🌐 Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## 🖥️ Cross-Platform

Works on:

- **Windows** - Windows 7+ with Node.js
- **macOS** - 10.13+ with Node.js
- **Linux** - Any distribution with Node.js 18+

### Linux/macOS Setup

```bash
git clone https://github.com/yourusername/youtubefit.git
cd youtubefit
npm install
npm run start:all
```

## 🐳 Docker (Optional)

Run without installing Node.js locally:

```bash
docker-compose up
```

Requires Docker and Docker Compose installed.

## 📚 Data & Privacy

- **Local-first**: All data stored locally in SQLite
- **No cloud sync**: Database never leaves your computer
- **YouTube integration**: Direct linking only (no rehosting)
- **CSV backup**: Export your data anytime

## 🤝 Contributing

**Want to add features or fix bugs?**

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Commit: `git commit -m 'Add amazing feature'`
5. Push: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Development Notes

- Frontend: React + Vite (runs on port 3000)
- Backend: Node.js + Express (runs on port 3001)
- Database: SQLite with better-sqlite3
- No external APIs required

## 📋 API Reference

### Core Endpoints

#### Workouts

- `GET /api/workouts` - List all workouts (supports filters)
- `GET /api/workouts/:id` - Get single workout
- `GET /api/workouts/channels` - Get all trainers with workout counts

#### Weekly Planning

- `GET /api/weekly-plan/:weekStart` - Get workouts for a week
- `POST /api/weekly-plan` - Save week plan

#### Collections

- `GET /api/favorites` - Get favorite workouts
- `POST /api/favorites` - Add to favorites
- `DELETE /api/favorites/:id` - Remove from favorites

- `GET /api/watchlater` - Get watch later workouts
- `POST /api/watchlater` - Add to watch later
- `DELETE /api/watchlater/:id` - Remove from watch later

#### Playlists

- `GET /api/playlists` - Get saved playlists
- `POST /api/playlists` - Create new playlist

#### History

- `GET /api/history` - Get workout history
- `POST /api/history` - Log completed workout

#### Recommendations

- `GET /api/recommendation/today` - Get recommendation for today

### Query Parameters

**Filters** (combine as needed):

- `type` - workout, yoga, warmup, cooldown
- `intensity` - low, medium, high
- `primary_target` - Full Body, Upper Body, Lower Body, Core, Cardio
- `equipment` - none, bands, dumbbells
- `channel_name` - Trainer name
- `vetted` - true/false
- `duration_min` - Minimum duration
- `duration_max` - Maximum duration

## ❓ Troubleshooting

### Port already in use

- Vite auto-finds available ports; check browser console for actual port

### Database locked error

- Ensure only one instance of the app is running

### Workouts not importing

- Verify CSV format matches specification
- Check `workouts.csv` exists in project root
- Run `npm run import` manually

### Images not loading

- Verify `public/img/` folder structure
- Check image file names match code references
- Clear browser cache (Ctrl+Shift+Delete)

### Dark mode logo not switching

- Ensure both `youtubefit_logo.png` and `youtubefit_logo-dark.png` exist in `public/img/logos/`

## 📄 License

[Add your license here - MIT, GPL, etc.]

## 💬 Support

For issues, questions, or feature requests:

- Open a GitHub issue
- Check existing issues first

## 🎓 Learning Resources

- [React Documentation](https://react.dev)
- [Express.js Guide](https://expressjs.com)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Vite Guide](https://vitejs.dev)


