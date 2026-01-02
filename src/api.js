const API_BASE = '/api';

export async function getWorkouts(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      params.append(key, value);
    }
  });

  const url = `${API_BASE}/workouts${params.toString() ? '?' + params.toString() : ''}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch workouts');
  return response.json();
}

export async function getWorkout(id) {
  const response = await fetch(`${API_BASE}/workouts/${id}`);
  if (!response.ok) throw new Error('Failed to fetch workout');
  return response.json();
}

export async function getChannels(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      // Handle arrays
      if (Array.isArray(value) && value.length > 0) {
        params.append(key, value.join(','));
      } else if (!Array.isArray(value)) {
        params.append(key, value);
      }
    }
  });
  const url = `${API_BASE}/workouts/channels${params.toString() ? '?' + params.toString() : ''}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch channels');
  return response.json();
}

export async function updateWorkout(id, updates) {
  const response = await fetch(`${API_BASE}/workouts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!response.ok) throw new Error('Failed to update workout');
  return response.json();
}

export async function getRecommendation(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      // Handle array values (like channels) by joining with comma
      if (Array.isArray(value) && value.length > 0) {
        params.append(key, value.join(','));
      } else if (!Array.isArray(value)) {
        params.append(key, value);
      }
    }
  });

  const url = `${API_BASE}/recommendation/today${params.toString() ? '?' + params.toString() : ''}`;
  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || 'Failed to get recommendation');
  }
  return response.json();
}

export async function getWarmupCooldown(workoutId) {
  const response = await fetch(`${API_BASE}/recommendation/warmup-cooldown/${workoutId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || 'Failed to get warmup/cooldown');
  }
  return response.json();
}

export async function logWorkout(date, workoutId, warmupId, cooldownId, notes) {
  const response = await fetch(`${API_BASE}/history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date,
      workout_id: workoutId,
      warmup_id: warmupId || null,
      cooldown_id: cooldownId || null,
      notes: notes || null
    })
  });
  if (!response.ok) throw new Error('Failed to log workout');
  return response.json();
}

export async function updateHistoryEntry(id, notes) {
  const response = await fetch(`${API_BASE}/history/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes })
  });
  if (!response.ok) throw new Error('Failed to update history entry');
  return response.json();
}

export async function deleteHistoryEntry(id) {
  const response = await fetch(`${API_BASE}/history/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete history entry');
  return response.json();
}

export async function getHistory(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      params.append(key, value);
    }
  });

  const url = `${API_BASE}/history${params.toString() ? '?' + params.toString() : ''}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch history');
  return response.json();
}

// Watch Later API
export async function getWatchLater() {
  const response = await fetch(`${API_BASE}/watchlater`);
  if (!response.ok) throw new Error('Failed to fetch watch later');
  return response.json();
}

export async function addToWatchLater(workoutId) {
  const response = await fetch(`${API_BASE}/watchlater`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workout_id: workoutId })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || 'Failed to add to watch later');
  }
  return response.json();
}

export async function removeFromWatchLater(workoutId) {
  const response = await fetch(`${API_BASE}/watchlater/${workoutId}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to remove from watch later');
  return response.json();
}

// Weekly Planner API
export async function getWeeklyPlan(weekStart) {
  const url = `${API_BASE}/weeklyplanner${weekStart ? '?week_start=' + weekStart : ''}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch weekly plan');
  return response.json();
}

export async function getMonthlyPlan(year, month) {
  const url = `${API_BASE}/weeklyplanner/month?year=${year}&month=${month}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch monthly plan');
  return response.json();
}

export async function saveWeeklyPlan(weekStartDate, dayOfWeek, workoutId, warmupId, cooldownId) {
  const response = await fetch(`${API_BASE}/weeklyplanner`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      week_start_date: weekStartDate,
      day_of_week: dayOfWeek,
      workout_id: workoutId,
      warmup_id: warmupId || null,
      cooldown_id: cooldownId || null
    })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || 'Failed to save weekly plan');
  }
  return response.json();
}

export async function updateWeeklyPlanItem(id, updates) {
  const response = await fetch(`${API_BASE}/weeklyplanner/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!response.ok) throw new Error('Failed to update weekly plan');
  return response.json();
}

export async function deleteWeeklyPlanItem(id) {
  const response = await fetch(`${API_BASE}/weeklyplanner/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete weekly plan item');
  return response.json();
}

// Favorites API
export async function getFavorites() {
  const response = await fetch(`${API_BASE}/favorites`);
  if (!response.ok) throw new Error('Failed to fetch favorites');
  return response.json();
}

export async function addToFavorites(workoutId) {
  const response = await fetch(`${API_BASE}/favorites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workout_id: workoutId })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || 'Failed to add to favorites');
  }
  return response.json();
}

export async function removeFromFavorites(workoutId) {
  const response = await fetch(`${API_BASE}/favorites/${workoutId}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to remove from favorites');
  return response.json();
}

// Playlists API
export async function getPlaylists() {
  const response = await fetch(`${API_BASE}/playlists`);
  if (!response.ok) throw new Error('Failed to fetch playlists');
  return response.json();
}

export async function getPlaylist(id) {
  const response = await fetch(`${API_BASE}/playlists/${id}`);
  if (!response.ok) throw new Error('Failed to fetch playlist');
  return response.json();
}

export async function createPlaylist(name, weekStartDate) {
  const response = await fetch(`${API_BASE}/playlists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, week_start_date: weekStartDate })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || 'Failed to create playlist');
  }
  return response.json();
}

export async function updatePlaylist(id, name) {
  const response = await fetch(`${API_BASE}/playlists/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  if (!response.ok) throw new Error('Failed to update playlist');
  return response.json();
}

export async function deletePlaylist(id) {
  const response = await fetch(`${API_BASE}/playlists/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete playlist');
  return response.json();
}

// Settings API
export async function clearAllHistory() {
  const response = await fetch(`${API_BASE}/history`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to clear history');
  return response.json();
}

export async function clearCurrentWeek() {
  const response = await fetch(`${API_BASE}/weeklyplanner`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to clear current week');
  return response.json();
}
