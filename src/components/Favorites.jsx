import React, { useState, useEffect } from 'react';
import { getFavorites, removeFromFavorites, getWorkouts, getWarmupCooldown, saveWeeklyPlan, updateWorkout } from '../api';
import { showToast } from '../utils/toast';
import './Favorites.css';

function Favorites({ onStartWorkout }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [showDaySelector, setShowDaySelector] = useState(null);
  const [editingNotes, setEditingNotes] = useState(null);
  const [notesValue, setNotesValue] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const data = await getFavorites();
      setItems(data);
    } catch (error) {
      console.error('Failed to load favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (workoutId) => {
    try {
      await removeFromFavorites(workoutId);
      setItems(items.filter(item => item.workout_id !== workoutId));
    } catch (error) {
      showToast('Failed to remove: ' + error.message);
    }
  };

  const handleEditNotes = (item) => {
    setEditingNotes(item.workout_id);
    setNotesValue(item.notes || '');
  };

  const handleSaveNotes = async (workoutId) => {
    setSavingNotes(true);
    try {
      await updateWorkout(workoutId, { notes: notesValue });
      setItems(items.map(item => 
        item.workout_id === workoutId ? { ...item, notes: notesValue } : item
      ));
      setEditingNotes(null);
      setNotesValue('');
    } catch (error) {
      showToast('Failed to save notes: ' + error.message);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingNotes(null);
    setNotesValue('');
  };

  const getYouTubeEmbedUrl = (videoUrl) => {
    if (!videoUrl) return '';
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/ 
    ];
    
    for (const pattern of patterns) {
      const match = videoUrl.match(pattern);
      if (match) {
        return `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1`;
      }
    }
    return videoUrl;
  };

  const handlePlusClick = (workoutId, e) => {
    e.stopPropagation();
    setDropdownOpen(dropdownOpen === workoutId ? null : workoutId);
  };

  const handleAddToWeek = (workoutId, e) => {
    e.stopPropagation();
    setDropdownOpen(null);
    setShowDaySelector(workoutId);
  };

  const handleSelectDay = async (workoutId, dayOfWeek) => {
    try {
      // Get Monday of current week
      const today = new Date();
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today.setDate(diff));
      const weekStart = monday.toISOString().split('T')[0];

      await saveWeeklyPlan(weekStart, dayOfWeek, workoutId, null, null);
      setShowDaySelector(null);
      showToast(`Added to ${dayOfWeek}!`);
    } catch (error) {
      showToast('Failed to add to week: ' + error.message);
    }
  };

  const handleDoNow = async (workoutId, e) => {
    e.stopPropagation();
    setDropdownOpen(null);
    setShowDaySelector(null);
    
    try {
      const item = items.find(i => i.workout_id === workoutId);
      if (!item) {
        showToast('Workout not found');
        return;
      }

      // Check if it's a yoga workout
      const isYoga = item.title?.toLowerCase().includes('yoga') ||
                     item.channel_name?.toLowerCase().includes('yoga') ||
                     item.channel_name?.toLowerCase().includes('adriene') ||
                     item.channel_name?.toLowerCase().includes('nancy');

      const workoutData = {
        workout: {
          workout_id: item.workout_id,
          title: item.title,
          video_url: item.video_url,
          duration_min: item.duration_min,
          intensity: item.intensity,
          primary_target: item.primary_target,
          channel_name: item.channel_name
        },
        warmup: null,
        cooldown: null,
        fromDoNow: true // Flag to indicate this came from "Do Now!"
      };

      // If not yoga, fetch warmup/cooldown
      if (!isYoga) {
        try {
          const warmupCooldown = await getWarmupCooldown(workoutId);
          workoutData.warmup = warmupCooldown.warmup;
          workoutData.cooldown = warmupCooldown.cooldown;
        } catch (err) {
          console.error('Failed to fetch warmup/cooldown:', err);
          // Continue without warmup/cooldown
        }
      }

      if (onStartWorkout) {
        onStartWorkout(workoutData);
      }
    } catch (error) {
      showToast('Failed to start workout: ' + error.message);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.plus-button-container')) {
        setDropdownOpen(null);
        setShowDaySelector(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="favorites">
      <h2>Favorites</h2>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : items.length === 0 ? (
        <div className="empty">No favorite workouts yet</div>
      ) : (
        <div className="favorites-list">
          {items.map((item) => (
            <div key={item.id} className="favorite-item">
              <div className="item-header">
                <h3>{item.title}</h3>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <div className="plus-button-container">
                    <button
                      className="btn-plus"
                      onClick={(e) => handlePlusClick(item.workout_id, e)}
                      title="Add to list"
                    >
                      +
                    </button>
                    {dropdownOpen === item.workout_id && (
                      <div className="plus-dropdown">
                        <button
                          onClick={(e) => handleAddToWeek(item.workout_id, e)}
                          className="dropdown-item"
                        >
                          Add to Week
                        </button>
                      </div>
                    )}
                    {showDaySelector === item.workout_id && (
                      <div className="day-selector">
                        <div className="day-selector-header">Select Day:</div>
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                          <button
                            key={day}
                            className="day-button"
                            onClick={() => handleSelectDay(item.workout_id, day)}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    className="btn-remove"
                    onClick={() => handleRemove(item.workout_id)}
                    title="Remove from Favorites"
                  >
                    ×
                  </button>
                </div>
              </div>
              <p className="item-meta">
                {item.duration_min} min • {item.intensity} • {item.primary_target}
              </p>
              <p className="item-channel">{item.channel_name}</p>
              {editingNotes === item.workout_id ? (
                <div className="favorites-notes-edit">
                  <textarea
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    placeholder="Add notes about this workout..."
                    rows="2"
                    className="notes-textarea"
                  />
                  <div className="notes-edit-actions">
                    <button
                      className="btn-notes-save"
                      onClick={() => handleSaveNotes(item.workout_id)}
                      disabled={savingNotes}
                    >
                      Save
                    </button>
                    <button
                      className="btn-notes-cancel"
                      onClick={handleCancelEdit}
                      disabled={savingNotes}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="favorites-notes-display">
                  {item.notes && (
                    <div className="favorites-notes-text">
                      <strong>Notes:</strong> {item.notes}
                    </div>
                  )}
                  <button
                    className="btn-notes-edit"
                    onClick={() => handleEditNotes(item)}
                    title={item.notes ? 'Edit notes' : 'Add notes'}
                  >
                    {item.notes ? '✏️ Edit Notes' : '📝 Add Notes'}
                  </button>
                </div>
              )}
              <div className="video-embed">
                <iframe
                  src={getYouTubeEmbedUrl(item.video_url)}
                  title={item.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              <div className="favorite-actions">
                <button
                  className="btn-do-now"
                  onClick={(e) => handleDoNow(item.workout_id, e)}
                >
                  Do Now!
                </button>
                <a
                  href={item.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-link"
                >
                  Open on YouTube
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Favorites;

