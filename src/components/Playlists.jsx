import React, { useState, useEffect } from 'react';
import { getPlaylists, updatePlaylist, deletePlaylist, getWeeklyPlan } from '../api';
import './Playlists.css';

function Playlists({ onUseWeek }) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    setLoading(true);
    try {
      const data = await getPlaylists();
      setPlaylists(data);
    } catch (error) {
      console.error('Failed to load playlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (playlist) => {
    setEditing(playlist.id);
    setEditName(playlist.name);
  };

  const handleSave = async (id) => {
    try {
      await updatePlaylist(id, editName);
      setEditing(null);
      loadPlaylists();
    } catch (error) {
      showToast('Failed to update playlist: ' + error.message);
    }
  };

  const handleCancel = () => {
    setEditing(null);
    setEditName('');
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this playlist? This will not delete the workouts, only the playlist reference.')) {
      return;
    }
    try {
      await deletePlaylist(id);
      loadPlaylists();
    } catch (error) {
      showToast('Failed to delete playlist: ' + error.message);
    }
  };

  const handleUseWeek = (playlist) => {
    if (onUseWeek) {
      onUseWeek(playlist.week_start_date);
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

  return (
    <div className="playlists">
      <h2>Playlists</h2>
      <p className="playlists-description">
        View and manage your saved weekly workout plans. Each week you build is automatically saved as a playlist.
      </p>

      {loading ? (
        <div className="loading">Loading playlists...</div>
      ) : playlists.length === 0 ? (
        <div className="empty">No playlists yet. Build a week to create your first playlist!</div>
      ) : (
        <div className="playlists-list">
          {playlists.map((playlist) => (
            <div key={playlist.id} className="playlist-item">
              {editing === playlist.id ? (
                <div className="playlist-edit">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="edit-input"
                    autoFocus
                  />
                  <div className="edit-actions">
                    <button className="btn-save" onClick={() => handleSave(playlist.id)}>
                      Save
                    </button>
                    <button className="btn-cancel" onClick={handleCancel}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="playlist-header">
                    <h3>{playlist.name}</h3>
                    <div className="playlist-actions">
                      <button
                        className="btn-edit"
                        onClick={() => handleEdit(playlist)}
                        title="Rename playlist"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(playlist.id)}
                        title="Delete playlist"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div className="playlist-meta">
                    <span>Week of {formatDate(playlist.week_start_date)}</span>
                    <span>•</span>
                    <span>{playlist.workout_count || 0} workouts</span>
                    <span>•</span>
                    <span>Created {formatDate(playlist.created_date)}</span>
                  </div>
                  <div className="playlist-actions-bottom">
                    <button
                      className="btn-use-week"
                      onClick={() => handleUseWeek(playlist)}
                      title="Use this week's workouts"
                    >
                      ▶ Use this Week
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Playlists;

