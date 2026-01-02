import React, { useState, useEffect } from 'react';
import { getHistory, addToFavorites, removeFromFavorites, getFavorites, updateHistoryEntry, deleteHistoryEntry, getWarmupCooldown } from '../api';
import { showToast } from '../utils/toast';
import './History.css';

function History({ onStartWorkout }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [favoritesLoading, setFavoritesLoading] = useState({});
  const [editingNotes, setEditingNotes] = useState(null);
  const [notesValue, setNotesValue] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadHistory();
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const favorites = await getFavorites();
      setFavoriteIds(new Set(favorites.map(f => f.workout_id)));
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  };

  const handleToggleFavorite = async (workoutId) => {
    setFavoritesLoading(prev => ({ ...prev, [workoutId]: true }));
    try {
      if (favoriteIds.has(workoutId)) {
        await removeFromFavorites(workoutId);
        setFavoriteIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(workoutId);
          return newSet;
        });
      } else {
        await addToFavorites(workoutId);
        setFavoriteIds(prev => new Set(prev).add(workoutId));
      }
    } catch (error) {
      showToast('Failed to update favorites: ' + error.message);
    } finally {
      setFavoritesLoading(prev => ({ ...prev, [workoutId]: false }));
    }
  };

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await getHistory();
      setHistory(data);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleEditNotes = (entry) => {
    setEditingNotes(entry.id);
    setNotesValue(entry.notes || '');
  };

  const handleSaveNotes = async (entryId) => {
    setSavingNotes(true);
    try {
      await updateHistoryEntry(entryId, notesValue);
      setHistory(history.map(entry => 
        entry.id === entryId ? { ...entry, notes: notesValue } : entry
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

  const handleDelete = async (entryId) => {
    if (!window.confirm('Are you sure you want to delete this history entry? This cannot be undone.')) {
      return;
    }

    setDeletingId(entryId);
    try {
      await deleteHistoryEntry(entryId);
      setHistory(history.filter(entry => entry.id !== entryId));
    } catch (error) {
      showToast('Failed to delete entry: ' + error.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleRepeatWorkout = async (entry) => {
    try {
      const workoutData = {
        workout: {
          workout_id: entry.workout_id,
          title: entry.workout_title,
          video_url: entry.workout_url,
          duration_min: entry.duration_min,
          intensity: entry.intensity,
          primary_target: entry.primary_target,
          channel_name: entry.channel_name
        },
        warmup: entry.warmup_id ? {
          workout_id: entry.warmup_id,
          title: entry.warmup_title,
          video_url: entry.warmup_url
        } : null,
        cooldown: entry.cooldown_id ? {
          workout_id: entry.cooldown_id,
          title: entry.cooldown_title,
          video_url: entry.cooldown_url
        } : null
      };

      if (onStartWorkout) {
        onStartWorkout(workoutData);
      }
    } catch (error) {
      showToast('Failed to repeat workout: ' + error.message);
    }
  };

  return (
    <div className="history">
      <h2>Workout History</h2>

      {loading ? (
        <div className="loading">Loading history...</div>
      ) : (
        <div className="history-list">
          {history.length === 0 ? (
            <div className="empty">No workout history yet</div>
          ) : (
            history.map((entry) => (
              <div key={entry.id} className="history-item">
                <div className="history-date-header">
                  <div className="history-date">{formatDate(entry.date)}</div>
                  <div className="history-date-actions">
                    {editingNotes === entry.id ? (
                      <div className="notes-edit-container">
                        <input
                          type="text"
                          className="notes-edit-input"
                          value={notesValue}
                          onChange={(e) => setNotesValue(e.target.value)}
                          placeholder="Add a note (e.g., 'Felt sick')"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveNotes(entry.id);
                            } else if (e.key === 'Escape') {
                              handleCancelEdit();
                            }
                          }}
                          autoFocus
                        />
                        <button
                          className="btn-notes-save"
                          onClick={() => handleSaveNotes(entry.id)}
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
                    ) : (
                      <div className="history-notes-display">
                        {entry.notes && (
                          <span className="history-notes-text">{entry.notes}</span>
                        )}
                        <button
                          className="btn-notes-edit"
                          onClick={() => handleEditNotes(entry)}
                          title={entry.notes ? 'Edit note' : 'Add note'}
                        >
                          {entry.notes ? '✏️' : '📝'}
                        </button>
                      </div>
                    )}
                    <button
                      className="btn-delete-history"
                      onClick={() => handleDelete(entry.id)}
                      disabled={deletingId === entry.id}
                      title="Delete entry"
                    >
                      {deletingId === entry.id ? '...' : '🗑️'}
                    </button>
                  </div>
                </div>
                <div className="history-workouts">
                  {entry.warmup_title && (
                    <div className="workout-entry warmup">
                      <span className="workout-label">Warmup:</span>
                      <a
                        href={entry.warmup_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="workout-link"
                      >
                        {entry.warmup_title}
                      </a>
                    </div>
                  )}
                  <div className="workout-entry main">
                    <span className="workout-label">Workout:</span>
                    <a
                      href={entry.workout_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="workout-link"
                    >
                      {entry.workout_title}
                    </a>
                    <button
                      className={`btn-favorite-small ${favoriteIds.has(entry.workout_id) ? 'active' : ''}`}
                      onClick={() => handleToggleFavorite(entry.workout_id)}
                      disabled={favoritesLoading[entry.workout_id]}
                      title={favoriteIds.has(entry.workout_id) ? 'Remove from Favorites' : 'Add to Favorites'}
                    >
                      {favoriteIds.has(entry.workout_id) ? '★' : '☆'}
                    </button>
                    <button
                      className="btn-repeat-workout"
                      onClick={() => handleRepeatWorkout(entry)}
                      title="Do this workout again"
                    >
                      Repeat
                    </button>
                  </div>
                  {entry.cooldown_title && (
                    <div className="workout-entry cooldown">
                      <span className="workout-label">Cooldown:</span>
                      <a
                        href={entry.cooldown_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="workout-link"
                      >
                        {entry.cooldown_title}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default History;

