import React, { useState, useEffect } from 'react';
import { getWorkouts, updateWorkout, addToWatchLater, removeFromWatchLater, getWatchLater, addToFavorites, removeFromFavorites, saveWeeklyPlan, getFavorites, getWarmupCooldown, getChannels } from '../api';
import { showToast } from '../utils/toast';
import './Library.css';

function Library({ onStartWorkout }) {
  const [activeTab, setActiveTab] = useState('library'); // 'library', 'favorites', 'watchlater'
  const [workouts, setWorkouts] = useState([]);
  const [favoriteItems, setFavoriteItems] = useState([]);
  const [watchLaterItems, setWatchLaterItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState([]);
  const [totalCount, setTotalCount] = useState(null);
  const [filters, setFilters] = useState({
    type: '',
    intensity: '',
    primary_target: '',
    equipment: '',
    vetted: '',
    channel_name: ''
  });
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editingNotes, setEditingNotes] = useState(null);
  const [notesValue, setNotesValue] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [watchLaterIds, setWatchLaterIds] = useState(new Set());
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [dropdownOpen, setDropdownOpen] = useState(null); // workout_id of open dropdown
  const [daySelectorModal, setDaySelectorModal] = useState({ show: false, workoutId: null, mode: 'thisWeek' }); // modal state

  useEffect(() => {
    if (activeTab === 'library') {
      loadWorkouts();
    } else if (activeTab === 'favorites') {
      loadFavoritesTab();
    } else if (activeTab === 'watchlater') {
      loadWatchLaterTab();
    }
    loadWatchLater();
    loadFavorites();
  }, [filters, activeTab]);

  useEffect(() => {
    const loadChannels = async () => {
      try {
        const data = await getChannels();
        const sorted = [...data].sort((a, b) => a.channel_name.localeCompare(b.channel_name));
        setChannels(sorted);
      } catch (error) {
        console.error('Failed to load channels:', error);
      }
    };
    loadChannels();
  }, []);

  const loadWatchLater = async () => {
    try {
      const items = await getWatchLater();
      setWatchLaterIds(new Set(items.map(item => item.workout_id)));
    } catch (error) {
      console.error('Failed to load watch later:', error);
    }
  };

  const loadFavorites = async () => {
    try {
      const items = await getFavorites();
      setFavoriteIds(new Set(items.map(item => item.workout_id)));
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  };

  const loadFavoritesTab = async () => {
    setLoading(true);
    try {
      const data = await getFavorites();
      setFavoriteItems(data);
    } catch (error) {
      console.error('Failed to load favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWatchLaterTab = async () => {
    setLoading(true);
    try {
      const data = await getWatchLater();
      setWatchLaterItems(data);
    } catch (error) {
      console.error('Failed to load watch later:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      // Show button when scrolled down more than 300px
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const loadWorkouts = async () => {
    setLoading(true);
    try {
      const data = await getWorkouts(filters);
      setWorkouts(data);
      // If no filters are active, the data we fetched is the full set
      const hasActiveFilter = Object.values(filters).some(v => v !== null && v !== undefined && v !== '');
      if (!hasActiveFilter) {
        setTotalCount(data.length);
      } else {
        // Fetch total count without filters
        try {
          const all = await getWorkouts();
          setTotalCount(all.length);
        } catch (err) {
          console.error('Failed to fetch total workouts count:', err);
          setTotalCount(null);
        }
      }
    } catch (error) {
      console.error('Failed to load workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (workout) => {
    setEditing(workout.workout_id);
    setEditForm({
      rating: workout.rating || '',
      do_not_recommend: workout.do_not_recommend ? true : false,
      vetted: workout.vetted ? true : false,
      notes: workout.notes || ''
    });
  };

  const handleSave = async (workoutId) => {
    try {
      // Clean up empty rating field
      const updates = { ...editForm };
      if (updates.rating === '') {
        updates.rating = null;
      }
      await updateWorkout(workoutId, updates);
      setEditing(null);
      loadWorkouts();
    } catch (error) {
      showToast('Failed to update workout: ' + error.message);
    }
  };

  const handleCancel = () => {
    setEditing(null);
    setEditForm({});
  };

  const handleToggleWatchLater = async (workoutId, e) => {
    e.stopPropagation();
    setDropdownOpen(null);
    try {
      if (watchLaterIds.has(workoutId)) {
        await removeFromWatchLater(workoutId);
        setWatchLaterIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(workoutId);
          return newSet;
        });
      } else {
        await addToWatchLater(workoutId);
        setWatchLaterIds(prev => new Set(prev).add(workoutId));
      }
    } catch (error) {
      showToast('Failed to update watch later: ' + error.message);
    }
  };

  const handleAddToFavorites = async (workoutId, e) => {
    e.stopPropagation();
    setDropdownOpen(null);
    try {
      await addToFavorites(workoutId);
      setFavoriteIds(prev => new Set(prev).add(workoutId));
      showToast('Added to favorites!');
    } catch (error) {
      showToast('Failed to add to favorites: ' + error.message);
    }
  };

  const handleAddToWeek = (workoutId, e) => {
    e.stopPropagation();
    setDropdownOpen(null);
    setDaySelectorModal({ show: true, workoutId, mode: 'thisWeek' });
  };

  const handleSelectDay = async (workoutId, dayOfWeek) => {
    try {
      if (daySelectorModal.mode === 'nextWeek') {
        await handleAddToNextWeek(workoutId, dayOfWeek);
      } else {
        // Get Monday of current week
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(today.setDate(diff));
        const weekStart = monday.toISOString().split('T')[0];

        await saveWeeklyPlan(weekStart, dayOfWeek, workoutId, null, null);
        showToast(`Added to ${dayOfWeek}!`);
      }
      setDaySelectorModal({ show: false, workoutId: null, mode: 'thisWeek' });
    } catch (error) {
      showToast('Failed to add to week: ' + error.message);
    }
  };

  const handleAddToNextWeek = async (workoutId, dayOfWeek) => {
    try {
      const today = new Date();
      // Calculate next week's Monday
      const day = today.getDay();
      const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
      const thisMonday = new Date(today.setDate(diffToMonday));
      const nextMonday = new Date(thisMonday);
      nextMonday.setDate(thisMonday.getDate() + 7);
      const weekStart = nextMonday.toISOString().split('T')[0];

      await saveWeeklyPlan(weekStart, dayOfWeek, workoutId, null, null);
      showToast(`Added to ${dayOfWeek} (next week)!`);
    } catch (error) {
      showToast('Failed to add to next week: ' + error.message);
    }
  };

  const handleAddToNextWeekPrompt = (workoutId, e) => {
    e.stopPropagation();
    setDropdownOpen(null);
    setDaySelectorModal({ show: true, workoutId, mode: 'nextWeek' });
  };

  const handleDoNow = async (workoutId, e) => {
    e.stopPropagation();
    setDropdownOpen(null);
    
    try {
      const workout = workouts.find(w => w.workout_id === workoutId);
      if (!workout) {
        showToast('Workout not found');
        return;
      }

      // Check if it's a yoga workout
      const isYoga = workout.type === 'yoga' ||
                     workout.title?.toLowerCase().includes('yoga') ||
                     workout.channel_name?.toLowerCase().includes('yoga') ||
                     workout.channel_name?.toLowerCase().includes('adriene') ||
                     workout.channel_name?.toLowerCase().includes('nancy');

      const workoutData = {
        workout: {
          workout_id: workout.workout_id,
          title: workout.title,
          video_url: workout.video_url,
          duration_min: workout.duration_min,
          intensity: workout.intensity,
          primary_target: workout.primary_target,
          channel_name: workout.channel_name
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

  const handlePlusClick = (workoutId, e) => {
    e.stopPropagation();
    setDropdownOpen(dropdownOpen === workoutId ? null : workoutId);
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

  // Handlers for Favorites tab
  const handleRemoveFavorite = async (workoutId) => {
    try {
      await removeFromFavorites(workoutId);
      setFavoriteItems(favoriteItems.filter(item => item.workout_id !== workoutId));
      setFavoriteIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(workoutId);
        return newSet;
      });
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
      setFavoriteItems(favoriteItems.map(item => 
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

  // Handlers for Watch Later tab
  const handleRemoveWatchLater = async (workoutId) => {
    try {
      await removeFromWatchLater(workoutId);
      setWatchLaterItems(watchLaterItems.filter(item => item.workout_id !== workoutId));
      setWatchLaterIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(workoutId);
        return newSet;
      });
    } catch (error) {
      showToast('Failed to remove: ' + error.message);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.plus-dropdown') && !e.target.closest('.btn-plus')) {
        setDropdownOpen(null);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [dropdownOpen]);

  return (
    <div className="library">
      <div className="library-header">
        <div className="library-tabs">
          <button
            className={activeTab === 'library' ? 'active' : ''}
            onClick={() => setActiveTab('library')}
          >
            Exercise Library
          </button>
          <button
            className={activeTab === 'favorites' ? 'active' : ''}
            onClick={() => setActiveTab('favorites')}
          >
            Favorites
          </button>
          <button
            className={activeTab === 'watchlater' ? 'active' : ''}
            onClick={() => setActiveTab('watchlater')}
          >
            Watch Later
          </button>
        </div>
      </div>

      {activeTab === 'library' && (
        <>
          <div className="filters">
        <div className="filters-row">
          <div className="filter-group">
            <label>Type</label>
            <select
              value={filters.type}
              onChange={(e) => {
                const newType = e.target.value;
                setFilters({
                  ...filters,
                  type: newType,
                  // Clear other filters when yoga is selected
                  primary_target: newType === 'yoga' ? '' : filters.primary_target,
                  intensity: newType === 'yoga' ? '' : filters.intensity,
                  equipment: newType === 'yoga' ? '' : filters.equipment
                });
              }}
            >
              <option value="">All</option>
              <option value="workout">Workout</option>
              <option value="warmup">Warmup</option>
              <option value="cooldown">Cooldown</option>
              <option value="yoga">🧘 Yoga</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Intensity</label>
            <select
              value={filters.intensity}
              onChange={(e) => setFilters({ ...filters, intensity: e.target.value })}
              disabled={filters.type === 'yoga'}
            >
              <option value="">All</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Target {filters.type !== 'yoga' && '*'}</label>
            <select
              value={filters.primary_target}
              onChange={(e) => setFilters({ ...filters, primary_target: e.target.value })}
              disabled={filters.type === 'yoga'}
            >
              <option value="">All</option>
              <option value="Full Body">Full Body</option>
              <option value="Upper Body">Upper Body</option>
              <option value="Lower Body">Lower Body</option>
              <option value="Core">Core</option>
              <option value="Cardio">Cardio</option>
            </select>
          </div>
        </div>

        <div className="filters-row">
          <div className="filter-group filter-group-equipment">
            <label>Equipment</label>
            <select
              value={filters.equipment}
              onChange={(e) => setFilters({ ...filters, equipment: e.target.value })}
              disabled={filters.type === 'yoga'}
            >
              <option value="">All</option>
              <option value="none">None</option>
              <option value="bands">Bands</option>
              <option value="dumbbells">Dumbbells</option>
            </select>
          </div>

          <div className="filter-group filter-group-vetted">
            <label>Vetted</label>
            <select
              value={filters.vetted}
              onChange={(e) => setFilters({ ...filters, vetted: e.target.value })}
            >
              <option value="">All</option>
              <option value="1">Yes</option>
              <option value="0">No</option>
            </select>
          </div>

          <div className="filter-group filter-group-trainer">
            <label>Trainer</label>
            <select
              value={filters.channel_name}
              onChange={(e) => setFilters({ ...filters, channel_name: e.target.value })}
            >
              <option value="">All</option>
              {channels.map(channel => (
                <option key={channel.channel_name} value={channel.channel_name}>
                  {channel.channel_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="library-summary">
        {totalCount !== null && (
          Object.values(filters).some(v => v !== null && v !== undefined && v !== '') ? (
            <div>Showing <strong>{workouts.length}</strong> of <strong>{totalCount}</strong> exercises</div>
          ) : (
            <div>Total exercises: <strong>{totalCount}</strong></div>
          )
        )}
      </div>

      {loading ? (
        <div className="loading">Loading workouts...</div>
      ) : (
        <div className="workout-list">
          {workouts.length === 0 ? (
            <div className="empty">No workouts found</div>
          ) : (
            workouts.map((workout) => (
              <div key={workout.workout_id} className="workout-item">
                {editing === workout.workout_id ? (
                  <div className="edit-form">
                    <h4>{workout.title}</h4>
                    <div className="form-group">
                      <label>Rating (1-4)</label>
                      <input
                        type="number"
                        min="1"
                        max="4"
                        value={editForm.rating}
                        onChange={(e) => setEditForm({ ...editForm, rating: e.target.value ? parseInt(e.target.value) : '' })}
                      />
                    </div>
                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={editForm.vetted}
                          onChange={(e) => setEditForm({ ...editForm, vetted: e.target.checked })}
                        />
                        Vetted
                      </label>
                    </div>
                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={editForm.do_not_recommend}
                          onChange={(e) => setEditForm({ ...editForm, do_not_recommend: e.target.checked })}
                        />
                        Do Not Recommend
                      </label>
                    </div>
                    <div className="form-group">
                      <label>Notes</label>
                      <textarea
                        value={editForm.notes || ''}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                        placeholder="Add notes about this workout..."
                        rows="3"
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontFamily: 'inherit' }}
                      />
                    </div>
                    <div className="form-actions">
                      <button className="btn-save" onClick={() => handleSave(workout.workout_id)}>
                        Save
                      </button>
                      <button className="btn-cancel" onClick={handleCancel}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="card-top-row">
                      <div className="plus-button-container">
                        <button
                          className="btn-plus"
                          onClick={(e) => handlePlusClick(workout.workout_id, e)}
                          title="Add to list"
                        >
                          +
                        </button>
                        {dropdownOpen === workout.workout_id && (
                          <div className="plus-dropdown">
                            <button
                              onClick={(e) => handleAddToWeek(workout.workout_id, e)}
                              className="dropdown-item"
                            >
                              Add to Week
                            </button>
                            <button
                              onClick={(e) => handleAddToNextWeekPrompt(workout.workout_id, e)}
                              className="dropdown-item"
                            >
                              Add to Next Week
                            </button>
                            <button
                              onClick={(e) => handleToggleWatchLater(workout.workout_id, e)}
                              className="dropdown-item"
                            >
                              {watchLaterIds.has(workout.workout_id) ? '✓ In Watch Later' : 'Add to Watch Later'}
                            </button>
                            <button
                              onClick={(e) => handleAddToFavorites(workout.workout_id, e)}
                              className="dropdown-item"
                              disabled={favoriteIds.has(workout.workout_id)}
                            >
                              {favoriteIds.has(workout.workout_id) ? '✓ In Favorites' : 'Add to Favorites'}
                            </button>
                          </div>
                        )}
                      </div>
                      {workout.notes && (
                        <div className="card-notes-inline">
                          <strong>Notes:</strong> <span>{workout.notes}</span>
                        </div>
                      )}
                    </div>
                    <div className="workout-header">
                      <h4>{workout.title}</h4>
                      <div className="badge-container">
                        <span className={`badge badge-${workout.type}`}>{workout.type}</span>
                        {workout.type === 'yoga' && <span className="yoga-indicator" title="Yoga Workout"></span>}
                      </div>
                    </div>
                    <p className="workout-meta">
                      {workout.duration_min} min • {workout.intensity} • {workout.primary_target}
                    </p>
                    <p className="workout-channel">{workout.channel_name}</p>
                    <div className="workout-tags">
                      {workout.rating && <span className="tag">⭐ {workout.rating}</span>}
                      {workout.vetted ? <span className="tag tag-vetted">✓ Vetted</span> : <span className="tag tag-not-vetted">Not Vetted</span>}
                      {workout.do_not_recommend ? <span className="tag tag-warning">⚠ Do Not Recommend</span> : null}
                    </div>
                    <div className="workout-actions">
                      <button
                        className="btn-do-now"
                        onClick={(e) => handleDoNow(workout.workout_id, e)}
                      >
                        Do Now!
                      </button>
                      <button className="btn-edit" onClick={() => handleEdit(workout)}>
                        Edit
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      )}
        </>
      )}

      {activeTab === 'favorites' && (
        <div className="favorites-tab">
          {loading ? (
            <div className="loading">Loading favorites...</div>
          ) : favoriteItems.length === 0 ? (
            <div className="empty">No favorites yet</div>
          ) : (
            <div className="favorites-list">
              {favoriteItems.map((item) => {
                const youtubeEmbedUrl = getYouTubeEmbedUrl(item.video_url);
                return (
                  <div key={item.workout_id} className="favorite-item">
                    <div className="card-top-row">
                      <div className="plus-button-container">
                        <button
                          className="btn-plus"
                          onClick={(e) => handlePlusClick(item.workout_id, e)}
                        >
                          +
                        </button>
                        {dropdownOpen === item.workout_id && (
                          <div className="plus-dropdown">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDropdownOpen(null);
                                setDaySelectorModal({ show: true, workoutId: item.workout_id, mode: 'thisWeek' });
                              }}
                              className="dropdown-item"
                            >
                              Add to Week
                            </button>
                            <button
                              onClick={(e) => handleAddToNextWeekPrompt(item.workout_id, e)}
                              className="dropdown-item"
                            >
                              Add to Next Week
                            </button>
                            <button
                              onClick={(e) => handleToggleWatchLater(item.workout_id, e)}
                              className="dropdown-item"
                            >
                              {watchLaterIds.has(item.workout_id) ? '✓ In Watch Later' : 'Add to Watch Later'}
                            </button>
                          </div>
                        )}
                      </div>
                      {item.notes && (
                        <div className="card-notes-inline">
                          <strong>Notes:</strong> <span>{item.notes}</span>
                        </div>
                      )}
                      {item.notes && (
                        <button
                          className="btn-edit-notes-icon"
                          onClick={() => handleEditNotes(item)}
                          title="Edit notes"
                        >
                          ✏️
                        </button>
                      )}
                      <button
                        className="btn-remove-corner"
                        onClick={() => handleRemoveFavorite(item.workout_id)}
                        title="Remove from favorites"
                      >
                        ×
                      </button>
                    </div>
                    <div className="item-header">
                      <h3>{item.title}</h3>
                    </div>
                    <div className="item-details">
                      <span className="channel">{item.channel_name}</span>
                      <span className="duration">{item.duration_min} min</span>
                      {item.intensity && <span className="intensity">{item.intensity}</span>}
                      {item.primary_target && <span className="target">{item.primary_target}</span>}
                    </div>
                    {youtubeEmbedUrl && (
                      <div className="video-container">
                        <iframe
                          src={youtubeEmbedUrl}
                          title={item.title}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}
                    {editingNotes === item.workout_id ? (
                      <div className="notes-edit">
                        <input
                          type="text"
                          value={notesValue}
                          onChange={(e) => setNotesValue(e.target.value)}
                          placeholder="Add a note..."
                          autoFocus
                        />
                        <div className="notes-actions">
                          <button
                            className="btn-save"
                            onClick={() => handleSaveNotes(item.workout_id)}
                            disabled={savingNotes}
                          >
                            {savingNotes ? 'Saving...' : 'Save'}
                          </button>
                          <button className="btn-cancel" onClick={handleCancelEdit}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                    <div className="favorite-actions">
                      <button
                        className="btn-do-now"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDoNow(item.workout_id, e);
                        }}
                      >
                        Do Now!
                      </button>
                      <a
                        href={item.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Open on YouTube
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'watchlater' && (
        <div className="watchlater-tab">
          {loading ? (
            <div className="loading">Loading watch later...</div>
          ) : watchLaterItems.length === 0 ? (
            <div className="empty">No workouts in your watch later list</div>
          ) : (
            <div className="watchlater-list">
              {watchLaterItems.map((item) => {
                const youtubeEmbedUrl = getYouTubeEmbedUrl(item.video_url);
                return (
                  <div key={item.workout_id} className="watchlater-item">
                    <div className="card-top-row">
                      <div className="plus-button-container">
                        <button
                          className="btn-plus"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDaySelectorModal({ show: true, workoutId: item.workout_id, mode: 'thisWeek' });
                          }}
                        >
                          +
                        </button>
                      </div>
                      {item.notes && (
                        <div className="card-notes-inline">
                          <strong>Notes:</strong> <span>{item.notes}</span>
                        </div>
                      )}
                      {item.notes && (
                        <button
                          className="btn-edit-notes-icon"
                          onClick={() => handleEditNotes(item)}
                          title="Edit notes"
                        >
                          ✏️
                        </button>
                      )}
                      <button
                        className="btn-remove-corner"
                        onClick={() => handleRemoveWatchLater(item.workout_id)}
                        title="Remove from watch later"
                      >
                        ×
                      </button>
                    </div>
                    <div className="item-header">
                      <h3>{item.title}</h3>
                    </div>
                    <div className="item-details">
                      <span className="channel">{item.channel_name}</span>
                      <span className="duration">{item.duration_min} min</span>
                      {item.intensity && <span className="intensity">{item.intensity}</span>}
                      {item.primary_target && <span className="target">{item.primary_target}</span>}
                    </div>
                    {youtubeEmbedUrl && (
                      <div className="video-container">
                        <iframe
                          src={youtubeEmbedUrl}
                          title={item.title}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}
                    {editingNotes === item.workout_id ? (
                      <div className="notes-edit">
                        <input
                          type="text"
                          value={notesValue}
                          onChange={(e) => setNotesValue(e.target.value)}
                          placeholder="Add a note..."
                          autoFocus
                        />
                        <div className="notes-actions">
                          <button
                            className="btn-save"
                            onClick={() => handleSaveNotes(item.workout_id)}
                            disabled={savingNotes}
                          >
                            {savingNotes ? 'Saving...' : 'Save'}
                          </button>
                          <button className="btn-cancel" onClick={handleCancelEdit}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                    <div className="watchlater-actions">
                      <button
                        className="btn-do-now"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDoNow(item.workout_id, e);
                        }}
                      >
                        Do Now!
                      </button>
                      <a
                        href={item.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Open on YouTube
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showScrollTop && (
        <button 
          className="scroll-to-top" 
          onClick={scrollToTop}
          aria-label="Scroll to top"
        >
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <path d="M18 15l-6-6-6 6"/>
          </svg>
        </button>
      )}

      {daySelectorModal.show && (
        <div className="day-selector-modal-overlay" onClick={() => setDaySelectorModal({ show: false, workoutId: null, mode: 'thisWeek' })}>
          <div className="day-selector-modal" onClick={(e) => e.stopPropagation()}>
            <div className="day-selector-modal-header">
              <h3>{daySelectorModal.mode === 'nextWeek' ? 'Add to Next Week' : 'Add to This Week'}</h3>
              <button 
                className="modal-close-btn"
                onClick={() => setDaySelectorModal({ show: false, workoutId: null, mode: 'thisWeek' })}
              >
                ×
              </button>
            </div>
            <div className="day-selector-modal-body">
              <p className="day-selector-instruction">Select a day:</p>
              <div className="day-buttons-grid">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                  <button
                    key={day}
                    className="day-abbr-button"
                    onClick={() => handleSelectDay(daySelectorModal.workoutId, day)}
                    title={day}
                  >
                    <span className="day-abbr">{day.slice(0, 3)}</span>
                    <span className="day-full">{day}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Library;

