import React, { useState, useEffect } from 'react';
import Today from './components/Today';
import Library from './components/Library';
import History from './components/History';
import BuildMyWeek from './components/BuildMyWeek';
import StartWorkout from './components/StartWorkout';
import Playlists from './components/Playlists';
import Settings from './components/Settings';
import Channels from './components/Channels';
import './App.css';

function App() {
  const [activeView, setActiveView] = useState('today');
  const [startWorkoutData, setStartWorkoutData] = useState(null);
  const [thisWeekStartDate, setThisWeekStartDate] = useState(null);
  const [initialViewMode, setInitialViewMode] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.getAttribute('data-theme') === 'dark');

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      setIsDarkMode(dark);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const handleStartWorkout = (workoutData) => {
    setStartWorkoutData(workoutData);
    setActiveView('start-workout');
  };

  const handleBackFromWorkout = () => {
    // If workout came from "Do Now!", go back to Home, otherwise go to This Week view
    const fromDoNow = startWorkoutData?.fromDoNow;
    const hasDay = startWorkoutData?.day; // If it has a day, it came from This Week
    setStartWorkoutData(null);
    if (fromDoNow) {
      setActiveView('today');
      setInitialViewMode(null);
    } else if (hasDay) {
      // Came from This Week - go to Today page but show Week view
      setActiveView('today');
      setInitialViewMode('week');
    } else {
      // Default to today/home
      setActiveView('today');
      setInitialViewMode(null);
    }
    // Don't clear thisWeekStartDate - keep the week that was being viewed
  };

  const handleUseWeekFromPlaylist = (weekStartDate) => {
    setThisWeekStartDate(weekStartDate);
    localStorage.setItem('thisWeekStartDate', weekStartDate);
    setActiveView('this-week');
  };

  // Helper to get Monday of current week
  const getMondayOfWeek = (date) => {
    const d = new Date(date);
    const dayOfWeek = d.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    d.setDate(d.getDate() - daysToSubtract);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [currentWeek, setCurrentWeek] = useState(() => getMondayOfWeek(new Date()));

  const getTodayDisplay = () => {
    try {
      const now = new Date();
      const options = { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'America/Chicago' };
      return now.toLocaleDateString('en-US', options);
    } catch (e) {
      return new Date().toLocaleDateString();
    }
  };

  useEffect(() => {
    // Update current week display (could be on interval if needed)
    setCurrentWeek(getMondayOfWeek(new Date()));
    
    // Listen for navigate-to-week event from BuildMyWeek
    const handleNavigateToWeek = () => {
      setActiveView('today');
      setInitialViewMode('week');
    };
    
    window.addEventListener('navigate-to-week', handleNavigateToWeek);
    return () => window.removeEventListener('navigate-to-week', handleNavigateToWeek);
  }, []);

  const formatWeekDisplay = (weekStart) => {
    // Parse date string directly to avoid timezone issues
    const [year, month, day] = weekStart.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const monthName = date.toLocaleDateString('en-US', { month: 'short' });
    const dayNum = date.getDate();
    const yearNum = date.getFullYear();
    return `${monthName} ${dayNum}, ${yearNum}`;
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <img 
            src={isDarkMode ? '/img/logos/youtubefit_logo-dark.svg' : '/img/logos/youtubefit_logo.svg'} 
            alt="YouTubeFit" 
            className="brand-logo" 
            onClick={() => setActiveView('today')}
            style={{ cursor: 'pointer' }}
            title="Go to Dashboard"
          />
          <div className="header-actions">
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div className="current-week-indicator" title="Current Week">
                📅 {formatWeekDisplay(currentWeek)}
              </div>
              <div className="current-week-indicator" title="Today">
                Today: <strong>{getTodayDisplay()}</strong>
              </div>
            </div>
            <button
              className="btn-channels"
              onClick={() => setActiveView('channels')}
              title="View Trainers"
            >
              👥 Trainers
            </button>
            <button
              className="btn-settings"
              onClick={() => setActiveView('settings')}
              title="Settings"
            >
              ⚙️
            </button>
          </div>
        </div>
        <nav className="nav-tabs">
          <button
            className={activeView === 'today' ? 'active' : ''}
            onClick={() => setActiveView('today')}
          >
            Dashboard
          </button>
          <button
            className={activeView === 'buildweek' ? 'active' : ''}
            data-tab="buildweek"
            onClick={() => setActiveView('buildweek')}
          >
            Build My Week
          </button>
          <button
            className={activeView === 'library' ? 'active' : ''}
            onClick={() => setActiveView('library')}
          >
            Library
          </button>
          <button
            className={activeView === 'playlists' ? 'active' : ''}
            onClick={() => setActiveView('playlists')}
          >
            Playlists
          </button>
          <button
            className={activeView === 'history' ? 'active' : ''}
            onClick={() => setActiveView('history')}
          >
            History
          </button>
        </nav>
      </header>

      <main className="app-main">
        {activeView === 'today' && (
          <Today 
            onStartWorkout={handleStartWorkout}
            initialWeekStart={thisWeekStartDate}
            onUseWeekFromPlaylist={handleUseWeekFromPlaylist}
            initialViewMode={initialViewMode}
            onViewModeSet={() => setInitialViewMode(null)}
          />
        )}
        {activeView === 'library' && <Library onStartWorkout={handleStartWorkout} />}
        {activeView === 'playlists' && <Playlists onUseWeek={handleUseWeekFromPlaylist} />}
        {activeView === 'buildweek' && <BuildMyWeek />}
        {activeView === 'start-workout' && <StartWorkout workoutData={startWorkoutData} onBack={handleBackFromWorkout} />}
        {activeView === 'history' && <History onStartWorkout={handleStartWorkout} />}
        {activeView === 'settings' && <Settings />}
        {activeView === 'channels' && <Channels />}
      </main>
    </div>
  );
}

export default App;

