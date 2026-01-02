import React, { useState, useEffect } from 'react';
import { logWorkout, getWarmupCooldown, addToFavorites, removeFromFavorites, getFavorites } from '../api';
import { showToast } from '../utils/toast';
import './StartWorkout.css';

function StartWorkout({ workoutData, onBack }) {
  const [logged, setLogged] = useState(false);
  const [workoutDataWithWarmupCooldown, setWorkoutDataWithWarmupCooldown] = useState(workoutData);
  const [loading, setLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoritesLoading, setFavoritesLoading] = useState(false);

  // Helper function to check if workout is Yoga
  const isYogaWorkout = (workout) => {
    if (!workout) return false;
    const title = workout.title?.toLowerCase() || '';
    const channel = workout.channel_name?.toLowerCase() || '';
    return title.includes('yoga') || 
           channel.includes('yoga') || 
           channel.includes('adriene') ||
           channel.includes('nancy');
  };

  // Fetch warmup/cooldown if missing and not yoga
  useEffect(() => {
    const fetchWarmupCooldown = async () => {
      if (!workoutData || !workoutData.workout) {
        setWorkoutDataWithWarmupCooldown(workoutData);
        return;
      }

      const workout = workoutData.workout;
      const isYoga = isYogaWorkout(workout);
      
      // If it's yoga, we don't need warmup/cooldown - just set the data
      if (isYoga) {
        setWorkoutDataWithWarmupCooldown(workoutData);
        return;
      }

      // If warmup and cooldown are already present, no need to fetch
      if (workoutData.warmup && workoutData.cooldown) {
        setWorkoutDataWithWarmupCooldown(workoutData);
        return;
      }

      // If either is missing, fetch them
      setLoading(true);
      try {
        const result = await getWarmupCooldown(workout.workout_id);
        setWorkoutDataWithWarmupCooldown({
          ...workoutData,
          warmup: workoutData.warmup || result.warmup,
          cooldown: workoutData.cooldown || result.cooldown
        });
      } catch (error) {
        console.error('Failed to fetch warmup/cooldown:', error);
        // Keep original data if fetch fails
        setWorkoutDataWithWarmupCooldown(workoutData);
      } finally {
        setLoading(false);
      }
    };

    fetchWarmupCooldown();
  }, [workoutData]);

  // Check if workout is in favorites
  useEffect(() => {
    const checkFavorite = async () => {
      if (!workoutDataWithWarmupCooldown?.workout?.workout_id) return;
      try {
        const favorites = await getFavorites();
        const favoriteIds = new Set(favorites.map(f => f.workout_id));
        setIsFavorite(favoriteIds.has(workoutDataWithWarmupCooldown.workout.workout_id));
      } catch (error) {
        console.error('Failed to check favorites:', error);
      }
    };
    checkFavorite();
  }, [workoutDataWithWarmupCooldown]);

  const handleToggleFavorite = async () => {
    if (!workoutDataWithWarmupCooldown?.workout?.workout_id) return;
    setFavoritesLoading(true);
    try {
      if (isFavorite) {
        await removeFromFavorites(workoutDataWithWarmupCooldown.workout.workout_id);
        setIsFavorite(false);
      } else {
        await addToFavorites(workoutDataWithWarmupCooldown.workout.workout_id);
        setIsFavorite(true);
      }
    } catch (error) {
      showToast('Failed to update favorites: ' + error.message);
    } finally {
      setFavoritesLoading(false);
    }
  };

  if (!workoutDataWithWarmupCooldown || !workoutDataWithWarmupCooldown.workout) {
    return (
      <div className="start-workout">
        {loading ? (
          <p>Loading warmup and cooldown...</p>
        ) : (
          <p>No workout data available</p>
        )}
        <button onClick={onBack} className="btn-back">Back</button>
      </div>
    );
  }

  const handleLogWorkout = async () => {
    const today = new Date().toISOString().split('T')[0];
    try {
      await logWorkout(
        today,
        workoutDataWithWarmupCooldown.workout.workout_id,
        workoutDataWithWarmupCooldown.warmup?.workout_id,
        workoutDataWithWarmupCooldown.cooldown?.workout_id
      );
      setLogged(true);
      showToast('Workout logged successfully!');
    } catch (err) {
      showToast('Failed to log workout: ' + err.message);
    }
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

  const isFromDoNow = workoutDataWithWarmupCooldown?.fromDoNow;
  const backButtonText = isFromDoNow ? 'Cancel Workout' : '← Back to Week';
  const workoutTitle = workoutDataWithWarmupCooldown.day 
    ? `${workoutDataWithWarmupCooldown.day} Workout`
    : 'Workout';

  return (
    <div className="start-workout">
      <div className="workout-header-bar">
        <button onClick={onBack} className="btn-back">{backButtonText}</button>
        <h2>{workoutTitle}</h2>
      </div>

      {loading && (
        <div className="loading-message">Loading warmup and cooldown...</div>
      )}

      <div className="recommendation">
        {workoutDataWithWarmupCooldown.warmup && (
          <div className="workout-card warmup">
            <h3>Warmup</h3>
            <h4>{workoutDataWithWarmupCooldown.warmup.title}</h4>
            <div className="video-embed">
              <iframe
                src={getYouTubeEmbedUrl(workoutDataWithWarmupCooldown.warmup.video_url)}
                title={workoutDataWithWarmupCooldown.warmup.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            <a
              href={workoutDataWithWarmupCooldown.warmup.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-link"
            >
              Open on YouTube
            </a>
          </div>
        )}

        <div className="workout-card main">
          <h3>Main Workout</h3>
          <h4>{workoutDataWithWarmupCooldown.workout.title}</h4>
          <p>
            {workoutDataWithWarmupCooldown.workout.duration_min} min • {workoutDataWithWarmupCooldown.workout.intensity} • {workoutDataWithWarmupCooldown.workout.primary_target}
          </p>
          <p className="channel">{workoutDataWithWarmupCooldown.workout.channel_name}</p>
          <div className="video-embed">
            <iframe
              src={getYouTubeEmbedUrl(workoutDataWithWarmupCooldown.workout.video_url)}
              title={workoutDataWithWarmupCooldown.workout.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
          <div className="workout-actions">
            <button
              className={`btn-favorite ${isFavorite ? 'active' : ''}`}
              onClick={handleToggleFavorite}
              disabled={favoritesLoading}
              title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            >
              {isFavorite ? '★' : '☆'}
            </button>
            <a
              href={workoutDataWithWarmupCooldown.workout.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-link"
            >
              Open on YouTube
            </a>
            <button 
              className="btn-secondary" 
              onClick={handleLogWorkout}
              disabled={logged}
            >
              {logged ? '✓ Logged' : 'Log Workout'}
            </button>
          </div>
        </div>

        {workoutDataWithWarmupCooldown.cooldown && (
          <div className="workout-card cooldown">
            <h3>Cooldown</h3>
            <h4>{workoutDataWithWarmupCooldown.cooldown.title}</h4>
            <div className="video-embed">
              <iframe
                src={getYouTubeEmbedUrl(workoutDataWithWarmupCooldown.cooldown.video_url)}
                title={workoutDataWithWarmupCooldown.cooldown.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            <a
              href={workoutDataWithWarmupCooldown.cooldown.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-link"
            >
              Open on YouTube
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default StartWorkout;

