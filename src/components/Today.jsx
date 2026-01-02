import React, { useState, useEffect } from 'react';
import { getRecommendation, logWorkout, addToFavorites, removeFromFavorites, getFavorites, getWeeklyPlan, getWarmupCooldown, getMonthlyPlan } from '../api';
import { showToast } from '../utils/toast';
import ThisWeek from './ThisWeek';
import './Today.css';

function Today({ onStartWorkout, initialWeekStart, onUseWeekFromPlaylist, initialViewMode, onViewModeSet }) {
  const [loading, setLoading] = useState(false);
  const [loadingTodaysWorkout, setLoadingTodaysWorkout] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [favoritesLoading, setFavoritesLoading] = useState({});
  const [filters, setFilters] = useState({
    target: '',
    duration_min: '',
    duration_max: '',
    intensity: '',
    equipment: '',
    yoga: false
  });
  const [error, setError] = useState(null);
  const [useTodaysWorkout, setUseTodaysWorkout] = useState(false);
  const [viewMode, setViewMode] = useState(initialViewMode || 'home'); // 'home', 'week', or 'month'
  const [monthlyPlans, setMonthlyPlans] = useState([]);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Handle initial view mode from props
  useEffect(() => {
    if (initialViewMode) {
      setViewMode(initialViewMode);
      if (onViewModeSet) {
        onViewModeSet(); // Clear the initial view mode after setting it
      }
    }
  }, [initialViewMode, onViewModeSet]);

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const favorites = await getFavorites();
        setFavoriteIds(new Set(favorites.map(f => f.workout_id)));
      } catch (error) {
        console.error('Failed to load favorites:', error);
      }
    };
    loadFavorites();
  }, []);

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

  // Get today's date in CST timezone
  const getTodayInCST = () => {
    const now = new Date();
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
    return utcDate;
  };

  // Get today's day name (Monday, Tuesday, etc.) in CST
  const getTodayDayName = () => {
    const today = getTodayInCST();
    const day = today.getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return dayNames[day];
  };

  // Get Monday of current week in CST
  const getCurrentWeekStart = () => {
    const today = getTodayInCST();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.getFullYear(), today.getMonth(), diff);
    const year = monday.getFullYear();
    const month = String(monday.getMonth() + 1).padStart(2, '0');
    const dayStr = String(monday.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };

  const handleLoadTodaysWorkout = async () => {
    setLoadingTodaysWorkout(true);
    setError(null);
    setUseTodaysWorkout(true);
    try {
      const weekStart = getCurrentWeekStart();
      const weekPlan = await getWeeklyPlan(weekStart);
      const todayDayName = getTodayDayName();
      
      // Only Monday-Friday have workouts
      if (['Saturday', 'Sunday'].includes(todayDayName)) {
        setError('No workout scheduled for weekends. Please use "Pick for Today" to get a recommendation.');
        setUseTodaysWorkout(false);
        return;
      }

      const todaysWorkout = weekPlan.find(item => item.day_of_week === todayDayName);
      
      if (!todaysWorkout) {
        setError(`No workout scheduled for ${todayDayName}. Please use "Pick for Today" to get a recommendation.`);
        setUseTodaysWorkout(false);
        return;
      }

      // Build recommendation object similar to getRecommendation response
      const workoutData = {
        workout: {
          workout_id: todaysWorkout.workout_id,
          title: todaysWorkout.workout_title,
          video_url: todaysWorkout.workout_url,
          duration_min: todaysWorkout.duration_min,
          intensity: todaysWorkout.intensity,
          primary_target: todaysWorkout.primary_target,
          channel_name: todaysWorkout.channel_name
        },
        warmup: todaysWorkout.warmup_id ? {
          workout_id: todaysWorkout.warmup_id,
          title: todaysWorkout.warmup_title,
          video_url: todaysWorkout.warmup_url
        } : null,
        cooldown: todaysWorkout.cooldown_id ? {
          workout_id: todaysWorkout.cooldown_id,
          title: todaysWorkout.cooldown_title,
          video_url: todaysWorkout.cooldown_url
        } : null
      };

      // If warmup or cooldown is missing and it's not yoga, fetch them
      const isYoga = workoutData.workout.title?.toLowerCase().includes('yoga') || 
                     workoutData.workout.channel_name?.toLowerCase().includes('yoga') ||
                     workoutData.workout.channel_name?.toLowerCase().includes('adriene') ||
                     workoutData.workout.channel_name?.toLowerCase().includes('nancy');

      if (!isYoga && (!workoutData.warmup || !workoutData.cooldown)) {
        try {
          const warmupCooldown = await getWarmupCooldown(workoutData.workout.workout_id);
          workoutData.warmup = workoutData.warmup || warmupCooldown.warmup;
          workoutData.cooldown = workoutData.cooldown || warmupCooldown.cooldown;
        } catch (err) {
          console.error('Failed to fetch warmup/cooldown:', err);
          // Continue without warmup/cooldown if fetch fails
        }
      }

      setRecommendation(workoutData);
    } catch (err) {
      const errorMsg = err.message.includes('Failed to fetch weekly plan') 
        ? 'Failed to fetch weekly plan, or you have not set a workout for today'
        : err.message;
      setError(errorMsg);
      setUseTodaysWorkout(false);
    } finally {
      setLoadingTodaysWorkout(false);
    }
  };

  const handleGetRecommendation = async () => {
    setLoading(true);
    setError(null);
    setUseTodaysWorkout(false);
    try {
      // Check for ideal day preference
      const savedIdealDays = localStorage.getItem('idealDays');
      let idealDays = {};
      if (savedIdealDays) {
        const parsed = JSON.parse(savedIdealDays);
        // Migrate old format (string) to new format (object)
        if (typeof parsed.Monday === 'string') {
          Object.keys(parsed).forEach(day => {
            idealDays[day] = { type: parsed[day] || '', target: '' };
          });
        } else {
          idealDays = parsed;
        }
      }
      
      const todayDayName = getTodayDayName();
      const idealDayPreference = idealDays[todayDayName];

      // Build filters object
      const apiFilters = { ...filters };
      
      // If there's an ideal day preference, use it (override current filters)
      if (idealDayPreference?.type === 'yoga') {
        apiFilters.yoga = 'true';
        // Clear other filters when yoga is selected
        apiFilters.target = '';
        apiFilters.intensity = '';
        apiFilters.equipment = '';
      } else if (idealDayPreference?.type === 'workout' && idealDayPreference?.target) {
        // Workout type with target specified
        apiFilters.yoga = undefined;
        delete apiFilters.yoga;
        apiFilters.target = idealDayPreference.target;
        // Keep other filters as they are, or clear them if needed
      } else if (filters.yoga) {
        // No ideal day preference, use current filter setting
        apiFilters.yoga = 'true';
        // Clear other filters when yoga is selected
        apiFilters.target = '';
        apiFilters.intensity = '';
        apiFilters.equipment = '';
      } else {
        // No ideal day preference, use current filters
        delete apiFilters.yoga;
      }
      
      const rec = await getRecommendation(apiFilters);
      setRecommendation(rec);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogWorkout = async () => {
    if (!recommendation) return;

    const today = new Date().toISOString().split('T')[0];
    try {
      await logWorkout(
        today,
        recommendation.workout.workout_id,
        recommendation.warmup?.workout_id,
        recommendation.cooldown?.workout_id
      );
      showToast('Workout logged successfully!');
      setRecommendation(null); // Clear recommendation after logging
    } catch (err) {
      showToast('Failed to log workout: ' + err.message);
    }
  };

  const getYouTubeEmbedUrl = (videoUrl) => {
    if (!videoUrl) return '';
    
    // Extract YouTube ID from various URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/ // Already just the ID
    ];
    
    for (const pattern of patterns) {
      const match = videoUrl.match(pattern);
      if (match) {
        const ytId = match[1];
        // Add parameters for better embed experience (autoplay=0, rel=0 to show fewer related videos)
        return `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`;
      }
    }
    
    return videoUrl;
  };

  const loadMonthlyPlan = async () => {
    setLoadingMonth(true);
    try {
      const plans = await getMonthlyPlan(currentYear, currentMonth);
      setMonthlyPlans(plans);
    } catch (error) {
      console.error('Failed to load monthly plan:', error);
      setError('Failed to load monthly plan');
    } finally {
      setLoadingMonth(false);
    }
  };

  // Load monthly plan when in month view
  useEffect(() => {
    if (viewMode === 'month') {
      loadMonthlyPlan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, currentMonth, currentYear]);

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

  // Convert weekly plan items to date-based map
  const getWorkoutForDate = (date) => {
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
    
    // Find the Monday of the week for this date
    const weekStart = getMondayOfWeek(date);
    
    // Find workout for this day in this week
    return monthlyPlans.find(p => 
      p.week_start_date === weekStart && 
      p.day_of_week === dayName &&
      ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(dayName)
    );
  };

  // Generate calendar days for current month
  const generateCalendarDays = () => {
    const year = currentYear;
    const month = currentMonth - 1; // JS months are 0-indexed
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const handleDayClick = async (date) => {
    if (!date) return;
    
    const workout = getWorkoutForDate(date);
    if (!workout) {
      showToast('No workout scheduled for this day');
      return;
    }

    setLoadingTodaysWorkout(true);
    setError(null);
    setUseTodaysWorkout(true);
    
    try {
      const workoutData = {
        workout: {
          workout_id: workout.workout_id,
          title: workout.workout_title,
          video_url: workout.workout_url,
          duration_min: workout.duration_min,
          intensity: workout.intensity,
          primary_target: workout.primary_target,
          channel_name: workout.channel_name
        },
        warmup: workout.warmup_id ? {
          workout_id: workout.warmup_id,
          title: workout.warmup_title,
          video_url: workout.warmup_url
        } : null,
        cooldown: workout.cooldown_id ? {
          workout_id: workout.cooldown_id,
          title: workout.cooldown_title,
          video_url: workout.cooldown_url
        } : null
      };

      // Fetch warmup/cooldown if missing
      const isYoga = workoutData.workout.title?.toLowerCase().includes('yoga') || 
                     workoutData.workout.channel_name?.toLowerCase().includes('yoga') ||
                     workoutData.workout.channel_name?.toLowerCase().includes('adriene') ||
                     workoutData.workout.channel_name?.toLowerCase().includes('nancy');

      if (!isYoga && (!workoutData.warmup || !workoutData.cooldown)) {
        try {
          const warmupCooldown = await getWarmupCooldown(workoutData.workout.workout_id);
          workoutData.warmup = workoutData.warmup || warmupCooldown.warmup;
          workoutData.cooldown = workoutData.cooldown || warmupCooldown.cooldown;
        } catch (err) {
          console.error('Failed to fetch warmup/cooldown:', err);
        }
      }

      setRecommendation(workoutData);
      setViewMode('home'); // Switch to home view to show the workout
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingTodaysWorkout(false);
    }
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();

  return (
    <div className="today">
      <div className="today-header">
        <div className="view-toggle">
          <button
            className={`view-toggle-btn ${viewMode === 'home' ? 'active' : ''}`}
            onClick={() => setViewMode('home')}
          >
            Home
          </button>
          <button
            className={`view-toggle-btn ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => setViewMode('week')}
          >
            This Week
          </button>
          <button
            className={`view-toggle-btn ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => setViewMode('month')}
          >
            This Month
          </button>
        </div>
      </div>

      {viewMode === 'home' && (
        <h2>Pick a Workout for Today</h2>
      )}

      {viewMode === 'week' ? (
        <ThisWeek 
          onStartWorkout={onStartWorkout}
          initialWeekStart={initialWeekStart}
          onUseWeekFromPlaylist={onUseWeekFromPlaylist}
        />
      ) : viewMode === 'month' ? (
        <div className="month-view">
          <div className="month-navigation">
            <button
              className="btn-month-nav"
              onClick={() => {
                if (currentMonth === 1) {
                  setCurrentMonth(12);
                  setCurrentYear(currentYear - 1);
                } else {
                  setCurrentMonth(currentMonth - 1);
                }
              }}
            >
              ← Prev
            </button>
            <h3>{monthNames[currentMonth - 1]} {currentYear}</h3>
            <button
              className="btn-month-nav"
              onClick={() => {
                if (currentMonth === 12) {
                  setCurrentMonth(1);
                  setCurrentYear(currentYear + 1);
                } else {
                  setCurrentMonth(currentMonth + 1);
                }
              }}
            >
              Next →
            </button>
          </div>

          {loadingMonth ? (
            <div className="loading">Loading monthly plan...</div>
          ) : (
            <div className="calendar">
              <div className="calendar-header">
                {dayNames.map(day => (
                  <div key={day} className="calendar-day-header">{day}</div>
                ))}
              </div>
              <div className="calendar-grid">
                {generateCalendarDays().map((date, index) => {
                  if (!date) {
                    return <div key={`empty-${index}`} className="calendar-day empty"></div>;
                  }
                  
                  const workout = getWorkoutForDate(date);
                  const isToday = date.toDateString() === today.toDateString();
                  const isPast = date < today && !isToday;
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  
                  return (
                    <div
                      key={date.toISOString()}
                      className={`calendar-day ${isToday ? 'today' : ''} ${isPast ? 'past' : ''} ${workout ? 'has-workout' : ''} ${workout?.completed ? 'completed' : ''} ${isWeekend ? 'weekend' : ''}`}
                      onClick={() => !isWeekend && handleDayClick(date)}
                    >
                      <div className="day-number">{date.getDate()}</div>
                      {workout && (
                        <div className="day-workout">
                          <div className="workout-title">{workout.workout_title}</div>
                          <div className="workout-meta">{workout.duration_min}min • {workout.intensity}</div>
                          {workout.completed && <div className="completed-badge">✓</div>}
                        </div>
                      )}
                      {isToday && <div className="today-indicator">Today</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>

      <div className="filters">
        <div className="filter-group">
          <label style={{ marginBottom: '0.5rem', display: 'block' }}>Type</label>
          <button
            type="button"
            className={`yoga-toggle-btn ${filters.yoga ? 'active' : ''}`}
            onClick={() => {
              const isYoga = !filters.yoga;
              setFilters({
                ...filters,
                yoga: isYoga,
                // Clear other filters when yoga is selected
                target: isYoga ? '' : filters.target,
                intensity: isYoga ? '' : filters.intensity,
                equipment: isYoga ? '' : filters.equipment
              });
            }}
          >
            <input
              type="checkbox"
              checked={filters.yoga}
              onChange={() => {}}
              style={{ display: 'none' }}
            />
            <span>Yoga Workout</span>
          </button>
        </div>

        <div className="filter-group">
          <label>Target Area {!filters.yoga && '*'}</label>
          <select
            value={filters.target}
            onChange={(e) => setFilters({ ...filters, target: e.target.value })}
            disabled={filters.yoga}
          >
            <option value="">Any</option>
            <option value="Full Body">Full Body</option>
            <option value="Upper Body">Upper Body</option>
            <option value="Lower Body">Lower Body</option>
            <option value="Core">Core</option>
            <option value="Cardio">Cardio</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Intensity</label>
          <select
            value={filters.intensity}
            onChange={(e) => setFilters({ ...filters, intensity: e.target.value })}
            disabled={filters.yoga}
          >
            <option value="">Any</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Equipment</label>
          <select
            value={filters.equipment}
            onChange={(e) => setFilters({ ...filters, equipment: e.target.value })}
            disabled={filters.yoga}
          >
            <option value="">Any</option>
            <option value="none">None</option>
            <option value="bands">Bands</option>
            <option value="dumbbells">Dumbbells</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Duration (min)</label>
          <div className="duration-inputs">
            <input
              type="number"
              placeholder="Min"
              value={filters.duration_min}
              onChange={(e) => setFilters({ ...filters, duration_min: e.target.value })}
              disabled={filters.yoga}
            />
            <span>to</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.duration_max}
              onChange={(e) => setFilters({ ...filters, duration_max: e.target.value })}
              disabled={filters.yoga}
            />
          </div>
        </div>
      </div>

      <div className="today-actions">
        <button 
          className="btn-load-today"
          onClick={handleLoadTodaysWorkout}
          disabled={loadingTodaysWorkout}
        >
          {loadingTodaysWorkout ? 'Loading...' : '📅 Load Today\'s Workout'}
        </button>
        <span className="action-divider">or</span>
        <button 
          className="btn-primary" 
          onClick={handleGetRecommendation}
          disabled={loading}
        >
          {loading ? 'Finding workout...' : 'Pick for Today'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {recommendation && useTodaysWorkout && (
        <div className="todays-workout-badge">
          📅 Today's Scheduled Workout ({getTodayDayName()})
        </div>
      )}

      {recommendation && (
        <div className="recommendation">
          {recommendation.warmup && (
            <div className="workout-card warmup">
              <h3>Warmup</h3>
              <h4>{recommendation.warmup.title}</h4>
              <p>{recommendation.warmup.duration_min} min • {recommendation.warmup.intensity}</p>
              <div className="video-embed">
                <iframe
                  src={getYouTubeEmbedUrl(recommendation.warmup.video_url)}
                  title={recommendation.warmup.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              <div className="workout-actions">
                <a
                  href={recommendation.warmup.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-link"
                >
                  Open on YouTube
                </a>
              </div>
            </div>
          )}

          <div className="workout-card main">
            <h3>Main Workout</h3>
            <h4>{recommendation.workout.title}</h4>
            <p>
              {recommendation.workout.duration_min} min • {recommendation.workout.intensity} • {recommendation.workout.primary_target}
            </p>
            <p className="channel">{recommendation.workout.channel_name}</p>
            <div className="video-embed">
              <iframe
                src={getYouTubeEmbedUrl(recommendation.workout.video_url)}
                title={recommendation.workout.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            <div className="workout-actions">
              <button
                className={`btn-favorite ${favoriteIds.has(recommendation.workout.workout_id) ? 'active' : ''}`}
                onClick={() => handleToggleFavorite(recommendation.workout.workout_id)}
                disabled={favoritesLoading[recommendation.workout.workout_id]}
                title={favoriteIds.has(recommendation.workout.workout_id) ? 'Remove from Favorites' : 'Add to Favorites'}
              >
                {favoriteIds.has(recommendation.workout.workout_id) ? '★' : '☆'}
              </button>
              <button 
                className="btn-cycle" 
                onClick={handleGetRecommendation}
                disabled={loading}
                title="Get another recommendation"
              >
                🔄
              </button>
              <a
                href={recommendation.workout.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-link"
              >
                Open on YouTube
              </a>
              <button className="btn-secondary" onClick={handleLogWorkout}>
                Log Workout
              </button>
            </div>
          </div>

          {recommendation.cooldown && (
            <div className="workout-card cooldown">
              <h3>Cooldown</h3>
              <h4>{recommendation.cooldown.title}</h4>
              <p>{recommendation.cooldown.duration_min} min • {recommendation.cooldown.intensity}</p>
              <div className="video-embed">
                <iframe
                  src={getYouTubeEmbedUrl(recommendation.cooldown.video_url)}
                  title={recommendation.cooldown.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              <div className="workout-actions">
                <a
                  href={recommendation.cooldown.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-link"
                >
                  Open on YouTube
                </a>
              </div>
            </div>
          )}
        </div>
      )}
        </>
      )}

      {showScrollTop && (
        <button className="scroll-to-top" onClick={scrollToTop} title="Scroll to top">
          ↑
        </button>
      )}
    </div>
  );
}

export default Today;

