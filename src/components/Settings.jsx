import React, { useState, useEffect } from 'react';
import { clearAllHistory, clearCurrentWeek } from '../api';
import './Settings.css';

function Settings() {
  const [clearingHistory, setClearingHistory] = useState(false);
  const [clearingWeek, setClearingWeek] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });

  const [idealDays, setIdealDays] = useState(() => {
    const saved = localStorage.getItem('idealDays');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrate old format (string) to new format (object)
      if (typeof parsed.Monday === 'string') {
        const migrated = {};
        Object.keys(parsed).forEach(day => {
          migrated[day] = { type: parsed[day] || '', target: '' };
        });
        return migrated;
      }
      return parsed;
    }
    return {
      Monday: { type: '', target: '' },
      Tuesday: { type: '', target: '' },
      Wednesday: { type: '', target: '' },
      Thursday: { type: '', target: '' },
      Friday: { type: '', target: '' },
      Saturday: { type: '', target: '' },
      Sunday: { type: '', target: '' }
    };
  });

  useEffect(() => {
    // Apply dark mode to document root
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('idealDays', JSON.stringify(idealDays));
  }, [idealDays]);

  const handleIdealDayTypeChange = (day, value) => {
    setIdealDays(prev => ({
      ...prev,
      [day]: {
        type: value,
        target: value === 'workout' ? (prev[day]?.target || '') : ''
      }
    }));
  };

  const handleIdealDayTargetChange = (day, value) => {
    setIdealDays(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        target: value
      }
    }));
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear ALL workout history? This action cannot be undone.')) {
      return;
    }

    if (!window.confirm('This will permanently delete all your workout history. Are you absolutely sure?')) {
      return;
    }

    setClearingHistory(true);
    setMessage({ type: '', text: '' });
    try {
      await clearAllHistory();
      setMessage({ type: 'success', text: 'All workout history has been cleared successfully.' });
      // Optionally reload the page to refresh the history view
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to clear history: ' + error.message });
    } finally {
      setClearingHistory(false);
    }
  };

  const handleClearCurrentWeek = async () => {
    if (!window.confirm('Are you sure you want to clear all workouts from the current week? This action cannot be undone.')) {
      return;
    }

    setClearingWeek(true);
    setMessage({ type: '', text: '' });
    try {
      await clearCurrentWeek();
      setMessage({ type: 'success', text: 'Current week has been cleared successfully.' });
      // Optionally reload the page to refresh views
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to clear current week: ' + error.message });
    } finally {
      setClearingWeek(false);
    }
  };

  return (
    <div className="settings">
      <h2>Settings</h2>

      {message.text && (
        <div className={`settings-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="settings-section">
        <h3>Appearance</h3>
        <div className="setting-item">
          <div className="setting-info">
            <h4>Dark Mode</h4>
            <p>Toggle between light and dark theme for better viewing in different lighting conditions.</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={darkMode}
              onChange={(e) => setDarkMode(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3>Ideal Day Preferences</h3>
        <p className="settings-description">
          Set your preferred workout type for each day of the week. When you use "Pick for Today", 
          it will automatically use your preference for that day if set.
        </p>
        <div className="ideal-days-grid">
          {Object.keys(idealDays).map((day) => (
            <div key={day} className="ideal-day-item">
              <label className="ideal-day-label">{day}</label>
              <select
                className="ideal-day-select"
                value={idealDays[day]?.type || ''}
                onChange={(e) => handleIdealDayTypeChange(day, e.target.value)}
              >
                <option value="">None (use filters)</option>
                <option value="yoga">Yoga</option>
                <option value="workout">Workout</option>
              </select>
              {idealDays[day]?.type === 'workout' && (
                <select
                  className="ideal-day-target-select"
                  value={idealDays[day]?.target || ''}
                  onChange={(e) => handleIdealDayTargetChange(day, e.target.value)}
                >
                  <option value="">Select Target...</option>
                  <option value="Full Body">Full Body</option>
                  <option value="Upper Body">Upper Body</option>
                  <option value="Lower Body">Lower Body</option>
                  <option value="Core">Core</option>
                  <option value="Cardio">Cardio</option>
                </select>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <h3>Data Management</h3>
        <p className="settings-description">Manage your workout data. These actions are permanent and cannot be undone.</p>

        <div className="settings-actions">
          <div className="setting-item">
            <div className="setting-info">
              <h4>Clear All History</h4>
              <p>Permanently delete all workout history entries. This will remove all records of completed workouts.</p>
            </div>
            <button
              className="btn-clear-history"
              onClick={handleClearHistory}
              disabled={clearingHistory}
            >
              {clearingHistory ? 'Clearing...' : 'Clear History'}
            </button>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <h4>Clear Current Week</h4>
              <p>Remove all scheduled workouts from the current week's planner. This will not affect past weeks or history.</p>
            </div>
            <button
              className="btn-clear-week"
              onClick={handleClearCurrentWeek}
              disabled={clearingWeek}
            >
              {clearingWeek ? 'Clearing...' : 'Clear Current Week'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
