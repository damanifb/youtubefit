import React, { useState, useEffect } from 'react';
import { getWeeklyPlan, updateWeeklyPlanItem, getPlaylists, createPlaylist, deleteWeeklyPlanItem, getRecommendation, saveWeeklyPlan, getWarmupCooldown, logWorkout, deleteHistoryEntry } from '../api';
import './ThisWeek.css';

function ThisWeek({ onStartWorkout, initialWeekStart, onUseWeekFromPlaylist }) {
  const [weekPlan, setWeekPlan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playlists, setPlaylists] = useState([]);
  const [showSavePlaylist, setShowSavePlaylist] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [savingPlaylist, setSavingPlaylist] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('');

  
  // Helper to get Monday of a week for any date
  const getMondayOfWeek = (date) => {
    // Parse date string directly to avoid timezone issues
    let d;
    if (typeof date === 'string') {
      const [year, month, day] = date.split('-').map(Number);
      d = new Date(year, month - 1, day); // month is 0-indexed
    } else {
      d = new Date(date);
    }
    const dayOfWeek = d.getDay();
    // Calculate days to subtract to get to Monday
    // Sunday (0) -> subtract 6 days, Monday (1) -> subtract 0, Tuesday (2) -> subtract 1, etc.
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    d.setDate(d.getDate() - daysToSubtract);
    // Format as YYYY-MM-DD
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get initial week start - prioritize initialWeekStart, then localStorage, then current week
  const getInitialWeekStart = () => {
    if (initialWeekStart) {
      // Ensure it's a Monday
      return getMondayOfWeek(initialWeekStart);
    }
    const saved = localStorage.getItem('thisWeekStartDate');
    if (saved) {
      // Ensure saved date is a Monday
      return getMondayOfWeek(saved);
    }
    return getMondayOfWeek(new Date());
  };

  const [weekStart, setWeekStart] = useState(getInitialWeekStart);

  // Update weekStart when initialWeekStart changes
  useEffect(() => {
    if (initialWeekStart) {
      const monday = getMondayOfWeek(initialWeekStart);
      if (monday !== weekStart) {
        setWeekStart(monday);
        localStorage.setItem('thisWeekStartDate', monday);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialWeekStart]);

  // Save weekStart to localStorage whenever it changes
  useEffect(() => {
    if (weekStart) {
      // Verify it's a Monday (should already be normalized, but double-check)
      const monday = getMondayOfWeek(weekStart);
      if (monday !== weekStart) {
        // If somehow not a Monday, normalize it (but this shouldn't happen)
        console.warn('Week start was not a Monday, normalizing:', weekStart, '->', monday);
        setWeekStart(monday);
        localStorage.setItem('thisWeekStartDate', monday);
      } else {
        localStorage.setItem('thisWeekStartDate', weekStart);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  useEffect(() => {
    loadWeekPlan();
    loadPlaylists();
  }, [weekStart]);

  const loadPlaylists = async () => {
    try {
      const data = await getPlaylists();
      setPlaylists(data);
    } catch (error) {
      console.error('Failed to load playlists:', error);
    }
  };

  const handlePlaylistChange = (e) => {
    const playlistId = e.target.value;
    setSelectedPlaylistId(playlistId);
    if (playlistId) {
      const playlist = playlists.find(p => p.id === parseInt(playlistId));
      if (playlist) {
        setWeekStart(playlist.week_start_date);
        localStorage.setItem('thisWeekStartDate', playlist.week_start_date);
      }
    }
  };

  // Update selectedPlaylistId when weekStart changes to match a playlist
  useEffect(() => {
    if (playlists.length > 0 && weekStart) {
      const matchingPlaylist = playlists.find(p => p.week_start_date === weekStart);
      if (matchingPlaylist) {
        setSelectedPlaylistId(matchingPlaylist.id.toString());
      } else {
        setSelectedPlaylistId('');
      }
    }
  }, [weekStart, playlists]);

  // Check if current week is already in a playlist
  const isWeekInPlaylist = () => {
    return playlists.some(p => p.week_start_date === weekStart);
  };

  const handleSavePlaylist = async () => {
    if (!playlistName.trim()) {
      showToast('Please enter a playlist name');
      return;
    }

    if (weekPlan.length === 0) {
      showToast('No workouts to save. This week has no planned workouts.');
      return;
    }

    setSavingPlaylist(true);
    try {
      await createPlaylist(playlistName.trim(), weekStart);
      showToast('Playlist saved successfully!');
      setPlaylistName('');
      setShowSavePlaylist(false);
      loadPlaylists(); // Refresh playlists list
    } catch (error) {
      showToast('Failed to save playlist: ' + error.message);
    } finally {
      setSavingPlaylist(false);
    }
  };

  const loadWeekPlan = async () => {
    setLoading(true);
    try {
      const data = await getWeeklyPlan(weekStart);
      setWeekPlan(data);
    } catch (error) {
      console.error('Failed to load week plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (item) => {
    try {
      // If marking as complete (not yet completed), log the workout to history
      if (!item.completed) {
        const today = new Date().toISOString().split('T')[0];
        await logWorkout(
          today,
          item.workout_id,
          item.warmup_id || null,
          item.cooldown_id || null,
          null
        );
      } else {
        // If unmarking as complete (currently completed), show warning and remove from history
        if (!confirm('Unmark as complete? This will remove it from your History.')) {
          return;
        }
        // Find and delete the corresponding history entry
        // For now, we'll need to fetch the history to find the entry to delete
        // This is a bit tricky without access to the history entry ID
        // We'll rely on the backend to handle cleanup or mark as uncompleted in weekly plan
      }
      
      await updateWeeklyPlanItem(item.id, { completed: !item.completed });
      setWeekPlan(prev => prev.map(p => 
        p.id === item.id ? { ...p, completed: !p.completed } : p
      ));
    } catch (error) {
      showToast('Failed to update: ' + error.message);
    }
  };

  const handleRemoveDay = async (item, e) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to remove ${item.day_of_week}'s workout?`)) {
      return;
    }
    try {
      await deleteWeeklyPlanItem(item.id);
      loadWeekPlan(); // Reload the week plan to reflect the change
    } catch (error) {
      showToast('Failed to remove workout: ' + error.message);
    }
  };



  const handleStartWorkout = (item) => {
    onStartWorkout({
      workout: {
        workout_id: item.workout_id,
        title: item.workout_title,
        video_url: item.workout_url,
        duration_min: item.duration_min,
        intensity: item.intensity,
        primary_target: item.primary_target,
        channel_name: item.channel_name
      },
      warmup: item.warmup_id ? {
        workout_id: item.warmup_id,
        title: item.warmup_title,
        video_url: item.warmup_url
      } : null,
      cooldown: item.cooldown_id ? {
        workout_id: item.cooldown_id,
        title: item.cooldown_title,
        video_url: item.cooldown_url
      } : null,
      day: item.day_of_week
    });
  };

  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const planByDay = {};
  weekPlan.forEach(item => {
    planByDay[item.day_of_week] = item;
  });

  return (
    <div className="this-week">
      <div className="week-selector">
        <div className="week-selector-group">
          <label>Week Starting:</label>
          <input
            type="date"
            value={weekStart}
            onChange={(e) => {
              // Normalize selected date to Monday of that week
              const selectedDate = e.target.value;
              if (selectedDate) {
                const monday = getMondayOfWeek(selectedDate);
                setWeekStart(monday);
                setSelectedPlaylistId(''); // Clear playlist selection when manually changing date
              }
            }}
            title="Select any date - it will automatically adjust to the Monday of that week"
          />
          <button
            className="btn-reset-week"
            onClick={() => {
              const currentWeek = getMondayOfWeek(new Date());
              setWeekStart(currentWeek);
              setSelectedPlaylistId('');
              localStorage.setItem('thisWeekStartDate', currentWeek);
            }}
            title="Reset to current week"
          >
            📅 Current Week
          </button>
          {!isWeekInPlaylist() && weekPlan.length > 0 && (
            <div className="save-playlist-group">
              {!showSavePlaylist ? (
                <button
                  className="btn-save-to-playlist"
                  onClick={() => setShowSavePlaylist(true)}
                >
                  💾 Save to Playlist
                </button>
              ) : (
                <div className="save-playlist-input">
                  <input
                    type="text"
                    placeholder="Enter playlist name..."
                    value={playlistName}
                    onChange={(e) => setPlaylistName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSavePlaylist()}
                    className="playlist-name-input"
                    autoFocus
                  />
                  <button
                    className="btn-save-playlist"
                    onClick={handleSavePlaylist}
                    disabled={savingPlaylist || !playlistName.trim()}
                  >
                    {savingPlaylist ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    className="btn-cancel-playlist"
                    onClick={() => {
                      setShowSavePlaylist(false);
                      setPlaylistName('');
                    }}
                    disabled={savingPlaylist}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        {playlists.length > 0 && (
          <div className="playlist-selector-group">
            <label>Or select from Playlist:</label>
            <select
              value={selectedPlaylistId}
              onChange={handlePlaylistChange}
              className="playlist-select"
            >
              <option value="">Choose a playlist...</option>
              {playlists.map(playlist => (
                <option key={playlist.id} value={playlist.id}>
                  {playlist.name} (Week of {new Date(playlist.week_start_date).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
        )}
        {isWeekInPlaylist() && (
          <div className="playlist-status">
            <span className="playlist-badge">✓ In Playlist</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading">Loading week plan...</div>
      ) : (
        <div className="week-grid">
          {dayOrder.map((day) => {
            const item = planByDay[day];
            return (
              <div
                key={day}
                className={`day-square ${item?.completed ? 'completed' : ''} ${item ? 'has-workout' : 'rest-day'}`}
                onClick={() => {
                  if (item) {
                    handleStartWorkout(item);
                  } else {
                    // Rest day - do nothing or show message
                  }
                }}
              >
                <div className="day-header">
                  <h3>{day}</h3>
                  {item && (
                    <div className="day-actions">
                      <button
                        className={`btn-complete ${item.completed ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleComplete(item);
                        }}
                        title={item.completed ? 'Mark as incomplete' : 'Mark as complete'}
                      >
                        {item.completed ? '✓' : '○'}
                      </button>
                      <button
                        className="btn-remove-day"
                        onClick={(e) => handleRemoveDay(item, e)}
                        title="Remove this workout"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
                {item ? (
                  <div className="workout-info">
                    <h4>{item.workout_title}</h4>
                    <p>{item.duration_min} min • {item.intensity}</p>
                    <p className="target">{item.primary_target}</p>
                    {item.warmup_title && <p className="extra">+ Warmup</p>}
                    {item.cooldown_title && <p className="extra">+ Cooldown</p>}
                  </div>
                ) : (
                  <div className="no-workout rest-day">
                    <p>🧘 Rest Day</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ThisWeek;

