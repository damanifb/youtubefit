![YouTubeFit Logo](public/img/logos/youtubefit_logo.svg)

A local-first workout planner and YouTube workout library with weekly generation, playlists, and history tracking.

- React + Vite frontend
- Express + SQLite backend
- CSV import support (workouts, trainers, history)

**Jump to:** [Features](#-features) · [Quick Start](#-quick-start) · [Usage Guide](#-usage-guide) · [Technical Setup](#-technical-setup) · [Troubleshooting](#-troubleshooting) · [License](#license)

---

## Table of Contents
- [🔴 Overview](#-overview)
- [🟡 Features](#-features)
  - [Library Management](#library-management)
  - [Weekly Planning](#weekly-planning)
  - [This Week & This Month Dashboard](#this-week--this-month-dashboard)
  - [Tracking & History](#tracking--history)
  - [Trainer Directory](#trainer-directory)
- [🟢 Quick Start](#-quick-start)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [One-Command Startup](#one-command-startup)
- [🔴 Usage Guide](#-usage-guide)
  - [Dashboard](#dashboard)
  - [Build My Week](#build-my-week)
  - [Library](#library)
  - [Typical Workflow](#typical-workflow)
  - [History & Tracking](#history--tracking)
  - [Settings](#settings)
- [🟡 Technical Setup](#-technical-setup)
  - [Ports & Configuration](#ports--configuration)
  - [File Structure](#file-structure)
  - [Important Files](#important-files)
  - [Adding New Workouts](#adding-new-workouts)
  - [Adding New Trainers](#adding-new-trainers)
  - [Linux/macOS Setup](#linuxmacos-setup)
  - [Data & Privacy](#data--privacy)
- [🔴 Troubleshooting](#-troubleshooting)
- [🔴 Stuff I know I should fix](#-stuff-i-know-i-should-fix)
- [License](#license)

---

# 🔴 Overview
During COVID, I discovered how many amazing trainers exist on YouTube. Starting with [Yoga With Adriene](https://www.youtube.com/@yogawithadriene) and eventually making our (Wife) way through some intense weightlifting sessions run by [Caroline Girvan](https://www.youtube.com/@CarolineGirvan), it has been about 5+ years of our YouTube fitness journey.

This project came about when we started to question if we did a specific routine already before (and didn't want to sift through history) and when we took a bit longer than we wanted to picking a routine for the day because you need to make sure there is no jumping or something in the video manually! On top of that, we had to find a warm up and a cool down to sandwhich our workouts with.

So, why not just build a quick tool to do all of this for us? Now, we simply set the targets we need for the week and workout. Even if you just need a tool to quickly pull a YouTube workout based on your preferences, this can handle this. Still a bit of an amateur, especially when it comes to sharing projects, but I use this regularly as it is.

<img width="1600" height="451" alt="librewolf_1mYIdHKoGi" src="https://github.com/user-attachments/assets/a7d04840-953b-4206-b2ec-b1642e3cf41e" />

---

# 🟡 Features

## Library Management
- **Exercise Library** - Browse 283 YouTube workouts with advanced filtering and the ability to add more on your own. I will also be updating the database over time.
- **Favorites** - Bookmark your go-to workouts for quick access
- **Watch Later** - Queue workouts you want to try as you look through the exercise library
- **Filters** - Type (workout/yoga/warmup/cooldown), intensity, target area, equipment, trainer, and vetted status

![ytfit-library](https://github.com/user-attachments/assets/58ba3c4f-a5a7-486e-8e67-abac84e9ee7e)

## Weekly Planning
- **Build My Week** - Plan your weekly workout schedule with three modes:
  - **Simple** - Quick type and intensity selection
  - **Basic** - Add intensity and target area preferences
  - **Advanced** - Full control with all filters
- **Auto-Generate** - Get recommendations based on your preferences
- **Rest Days** - Workouts without selections automatically marked as rest days :D

<img width="1590" height="635" alt="ytfit-weekbuilder" src="https://github.com/user-attachments/assets/fd015c80-1c95-48b0-acc6-c3eb0be442c9" />

## This Week & This Month Dashboard
- **Week / Monthly Overview** - Visual grid of your planned workouts
- **Quick Access** - Start any day's workout with one click
- **Save as Playlist** - Create reusable weekly schedules
- **Load Playlists** - Apply saved plans to any week

<img width="1586" height="590" alt="ytfit-dashboard-thisweek" src="https://github.com/user-attachments/assets/5d1b4359-1384-4b84-a169-823e769c9310" />

## Tracking & History
- **Workout Logging** - Mark workouts as complete, view history
- **Monthly Calendar** - See your fitness activity across 30 days
- **Home Dashboard** - Pick a workout for today with smart recommendations

<img width="1586" height="343" alt="ytfit-history" src="https://github.com/user-attachments/assets/83d8bbfc-ed58-416e-b880-91e58d766a32" />

## Trainer Directory
- Browse all available trainers
- View total workout count per trainer
- Direct links to YouTube channels (please sub to them all!)

<img width="1586" height="631" alt="ytfit-trainers" src="https://github.com/user-attachments/assets/2da5aab9-2671-4a14-ab87-05945f8c6dbd" />

---

# 🟢 Quick Start

## Prerequisites
- **Node.js** ([https://nodejs.org Node.js 18+](https://nodejs.org))
- **npm** (included with Node.js)

## Installation

1. **Clone and navigate:**
```bash
git clone https://github.com/yourusername/youtubefit.git
cd youtubefit
```

2. **Install dependencies:**
```bash
npm install
```

This installs all required packages including SQLite, React, Vite, and Express.

3. **Start the application:**
```bash
npm run start:all
```

This starts both backend and frontend servers concurrently.

4. **Open in browser:**
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3001`

The database (`youtubefit.db`) will be created automatically on first run, and starter CSV data will be imported.

## One-Command Startup
```bash
npm run start:all
```

Launches:
- Backend server on port 3001
- Frontend dev server on port 3000
- Automatic database initialization
- CSV data import

---

# 🔴 Usage Guide

## Dashboard
Pick a workout for today with smart recommendations.

**Use filters to narrow results:**
- **Type** - Workout, Yoga, or paired Warmup/Cooldown
- **Target Area** - Full Body, Upper, Lower, Core, Cardio
- **Intensity** - Low, Medium, High
- **Equipment** - None, Bands, Dumbbells

![ytfit-dashboard](https://github.com/user-attachments/assets/e8267678-b740-4d6f-ad85-f2516d4a6baf)

## Build My Week
Plan your entire week with three modes. Switch modes with tabs at the top.

### Simple Mode
Fast planning:
- Select type (Workout/Yoga)
- Choose intensity level
- Generate week

### Basic Mode
Standard planning:
- Type, Intensity, Target Area
- Equipment preferences
- Generate based on selections

### Advanced Mode
Full control:
- All available filters
- Most granular control
- Create highly specific weeks

![ytfit-weekbuild](https://github.com/user-attachments/assets/3beff6ce-6659-4672-8cbf-f466396bae5a)

## Library
Three tabs for workout management:

### Exercise Library Tab
- Browse all workouts
- Use filters to find workouts matching your preferences
- Notes display inline with each workout
- Edit workout ratings and metadata
- Add to your week directly from cards

### Favorites Tab
- Your bookmarked workouts
- Video preview and YouTube link
- Quick "Do Now!" access
- Full editing capabilities

### Watch Later Tab
- Queue for future workouts
- Same features as Favorites
- Move to your week when ready

<img width="1586" height="730" alt="ytfit-library" src="https://github.com/user-attachments/assets/a5e6f163-a4d2-48a3-ba8e-22d37dc49870" />

## Typical Workflow

### Building a Week
1. Click on the Build My Week tab
1. Use the secondary options to choose between Simple, Basic, Advanced menu choices
1. Check the "Week starting" to make sure you're editing the correct week
1. Edit each day (or leave blank if it's a rest day, use the x to reset that days settings)
1. Click **"Generate Week"** (all filters apply to all days)
1. Click **"Create Playlist"** to save the week for reuse
1. Click **"Jump to This Week"** to see this week on your Dashboard

#### Day Management
- Click **×** to clear all selections for a day
- Mark day as Rest Day (removes workout)
- Jump to This Week view to see your plan

### This Week
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

## History & Tracking
View your complete workout history:
- Chronological list of all completed workouts
- Workout details (date, title, duration, trainer)
- Filter by month with navigation

## Settings
- **Dark Mode** - Toggle between light and dark themes (affects logo display)
- **Ideal Day Preferences** - Set your preferred workout type for each day of the week. When you use "Pick for Today", it will automatically use your preference for that day if set. So if you tend to do Yoga mondays, set that here.

<img width="1566" height="722" alt="Settings" src="https://github.com/user-attachments/assets/75232739-e48e-4c86-a070-91e20a614b16" />

---

# 🟡 Technical Setup

## Ports & Configuration
- **Frontend Dev Server**: Port 3000 (auto-fallback if in use)
- **Backend API Server**: Port 3001 (auto-fallback if in use)
- **Database**: `youtubefit.db` (created in project root)

## File Structure
```txt
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

## Important Files
- **workouts.csv** - Required. Contains all workout definitions
- **channels.csv** - Trainer/channel information (auto-created if missing)
- **youtubefit.db** - SQLite database (auto-created on first run)

## Adding New Workouts

### Manual CSV Import
1. Prepare CSV with columns: `id, title, channel_name, video_url, type, primary_target, intensity, duration_min, equipment, notes`
2. Place in project root as `workouts.csv`
3. Run: `npm run import`
4. Restart the app

### CSV Format Example
```csv
Workout_ID,YT_ID,Workout_Title,YT_Title,Uploader_Name,Channel_URL,Video_URL,Type,Format,Intensity,Primary_Target,Target_Tag1,Target_Tag2,Equipment,Impact,Standing_Floor,Instructor_Talk,Music_Vibe,Duration_Min,Time_Bucket,Vetted,Rating,Do_Not_Recommend,Repeat_Cooldown_Days,Link_Status,Last_Checked
YF-CG01,a-V4Or5xyis,20 Min Cardio HIIT Workout,CHILLED CARDIO WORKOUT,Caroline Girvan,https://www.youtube.com/@CarolineGirvan,https://www.youtube.com/watch?v=a-V4Or5xyis,Workout,HIIT,High,Cardio,Full Body,,None,High,Mixed,None,Loud,20,15-25,Y,,N,7,Ok,12/30/25
YF-CG02,QFwEQqbdCo4,15 Min Core Strength Workout,15 Min STANDING ABS WORKOUT,Caroline Girvan,https://www.youtube.com/@CarolineGirvan,https://www.youtube.com/watch?v=QFwEQqbdCo4,Workout,Strength,High,Core,Abs,,Dumbbells,High,Standing,None,Loud,15,10-20,Y,,N,14,Ok,12/30/25
YF-CG03,1WIah0t1Bzw,20 Min Core Strength Workout,20 Minute Abs and Core Workout,Caroline Girvan,https://www.youtube.com/@CarolineGirvan,https://www.youtube.com/watch?v=1WIah0t1Bzw,Workout,Strength,High,Core,Abs,,Dumbbells,High,Floor,None,Loud,20,15-25,Y,,N,14,Ok,12/30/25
```

## Adding New Trainers
1. **Add trainer to channels.csv** (project root):
```csv
Channel_URL,Uploader_Name,Video_Count
https://www.youtube.com/@CarolineGirvan,Caroline Girvan,65
```

2. **Add trainer image** (optional, for profile display, otherwise just an empty card):
```txt
public/img/trainers/{TrainerName}.jpg
```

In this example, Caroline Girvan's image will use her @ address but without the @ -> `CarolineGirvan.jpg`

Some other examples:
- https://www.youtube.com/@julia.reppel -> `julia.reppel.jpg`
- https://www.youtube.com/@TRAINWITHGAINSBYBRAINS -> `TRAINWITHGAINSBYBRAINS.jpg`
- https://www.youtube.com/@midasmvmt -> `midasmvmt.jpg`

Recommended size: 300x300px or larger.  
I went with 800x800, using this site to pull them:  
https://seostudio.tools/youtube-channel-logo-downloader

3. **Restart the app**
   - Trainer appears in Trainers page (alphabetically sorted)
   - Available in all filter dropdowns

## Linux/macOS Setup
```bash
git clone https://github.com/yourusername/youtubefit.git
cd youtubefit
npm install
npm run start:all
```

## Data & Privacy
- **Local-first**: All data stored locally in SQLite
- **No cloud sync**: Database never leaves your computer
- **YouTube integration**: Direct linking only (no rehosting)
- **CSV backup**: Easy to export

---

# 🔴 Troubleshooting
Okay I lied I looked over some of this as well

### YouTube Asking me to Sign in...
If you use a VPN, it might ask you to sign in when viewing an embedded video. Pretty frustrating. I'll try to figure something out.

### Port already in use
- Vite auto-finds available ports; check browser console for actual port

### Database locked error
- Ensure only one instance of the app is running

### Adding Your own Workouts
The sheet for adding your own workouts / trainers is a bit heavy, but if you can figure out a script or way to pull videos from YT, you'd have a giant library of workout videos to cycle through.

### Workouts not importing
- Verify CSV format matches specification
- Check `workouts.csv` exists in project root
- Run `npm run import` manually

### Images not loading
- Verify `public/img/` folder structure
- Check image file names match code references
- Clear browser cache (Ctrl+Shift+Delete)

### Dark mode logo not switching
- Ensure both `youtubefit_logo.svg` and `youtubefit_logo-dark.svg` exist in `public/img/logos/`
- Sometimes, you have to refresh if you started on light mode. It's so goofy, and I'll work on it at some point.

---

# 🔴 Stuff I know I should fix
- [ ] I don't think it makes sense to have an add playlist button on the Week Builder. Going to remove that, it could cause some errors.
- [ ] Clear Current Week isn't working properly. Will look into that. I think it's playlist related.
- [ ] Notification for Playlist Saved to match other notifications
- [ ] Make all pop-ups display like the date picker in the Library
- [ ] Alphabetically sorted trainers page by username instead of real name maybe?

---

## License
Copyright (c) 2026 Damani B.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
