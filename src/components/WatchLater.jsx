import React, { useState, useEffect } from 'react';
import { getWatchLater, removeFromWatchLater, saveWeeklyPlan } from '../api';
import { showToast } from '../utils/toast';
import './WatchLater.css';

function WatchLater() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDaySelector, setShowDaySelector] = useState(null); // workout_id for day selector

  useEffect(() => {
    loadWatchLater();
  }, []);

  const loadWatchLater = async () => {
    setLoading(true);
    try {
      const data = await getWatchLater();
      setItems(data);
    } catch (error) {
      console.error('Failed to load watch later:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (workoutId) => {
    try {
      await removeFromWatchLater(workoutId);
      setItems(items.filter(item => item.workout_id !== workoutId));
    } catch (error) {
      showToast('Failed to remove: ' + error.message);
    }
  };

  const handleAddToWeek = (workoutId) => {
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

  // Close day selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.add-to-week-container')) {
        setShowDaySelector(null);
      }
    };
    if (showDaySelector) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDaySelector]);

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

  return (
    <div className="watch-later">
      <h2>Watch Later</h2>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : items.length === 0 ? (
        <div className="empty">No workouts in your watch later list</div>
      ) : (
        <div className="watch-later-list">
          {items.map((item) => (
            <div key={item.id} className="watch-later-item">
              <div className="item-header">
                <h3>{item.title}</h3>
                <button
                  className="btn-remove"
                  onClick={() => handleRemove(item.workout_id)}
                  title="Remove from Watch Later"
                >
                  ×
                </button>
              </div>
              <p className="item-meta">
                {item.duration_min} min • {item.intensity} • {item.primary_target}
              </p>
              <p className="item-channel">{item.channel_name}</p>
              <div className="video-embed">
                <iframe
                  src={getYouTubeEmbedUrl(item.video_url)}
                  title={item.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              <div className="item-actions">
                <div className="add-to-week-container">
                  <button
                    className="btn-add-to-week"
                    onClick={() => handleAddToWeek(item.workout_id)}
                  >
                    Add to Week
                  </button>
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
                      <button
                        className="day-button cancel"
                        onClick={() => setShowDaySelector(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
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

export default WatchLater;

