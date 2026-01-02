import React, { useState, useEffect } from 'react';
import { getRecommendation, saveWeeklyPlan, getWeeklyPlan, deleteWeeklyPlanItem, createPlaylist, getChannels } from '../api';
import { showToast } from '../utils/toast';
import './BuildMyWeek.css';

function BuildMyWeek() {
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

  const [weekStart, setWeekStart] = useState(() => {
    // Get Monday of current week
    return getMondayOfWeek(new Date());
  });

  const [days, setDays] = useState({
    Monday: { target: '', duration_min: '', duration_max: '', intensity: '', equipment: '', special_tag: '', channels: [], yoga: false },
    Tuesday: { target: '', duration_min: '', duration_max: '', intensity: '', equipment: '', special_tag: '', channels: [], yoga: false },
    Wednesday: { target: '', duration_min: '', duration_max: '', intensity: '', equipment: '', special_tag: '', channels: [], yoga: false },
    Thursday: { target: '', duration_min: '', duration_max: '', intensity: '', equipment: '', special_tag: '', channels: [], yoga: false },
    Friday: { target: '', duration_min: '', duration_max: '', intensity: '', equipment: '', special_tag: '', channels: [], yoga: false },
    Saturday: { target: '', duration_min: '', duration_max: '', intensity: '', equipment: '', special_tag: '', channels: [], yoga: false },
    Sunday: { target: '', duration_min: '', duration_max: '', intensity: '', equipment: '', special_tag: '', channels: [], yoga: false }
  });

  const [loading, setLoading] = useState({});
  const [saved, setSaved] = useState({});
  const [playlistName, setPlaylistName] = useState('');
  const [channels, setChannels] = useState([]);
  const [showChannelDropdown, setShowChannelDropdown] = useState({});
  const [showSpecialTagHelp, setShowSpecialTagHelp] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [simpleMode, setSimpleMode] = useState(false);

  // Available special tags (from lists.csv Targets column)
  const specialTags = [
    'Abs', 'Arms', 'Back', 'Biceps', 'Calves', 'Cardio', 'Chest', 'Core',
    'Flexibility', 'Forearms', 'Full Body', 'Glutes', 'Hamstrings', 'Legs',
    'Lower Body', 'Mobility', 'Neck', 'Obliques', 'Quads', 'Shoulders',
    'Traps', 'Triceps', 'Upper Body'
  ];

  useEffect(() => {
    const loadChannels = async () => {
      try {
        const data = await getChannels();
        setChannels(data);
      } catch (error) {
        console.error('Failed to load channels:', error);
      }
    };
    loadChannels();
  }, []);

  // Close channel dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.channel-dropdown-container')) {
        setShowChannelDropdown({});
      }
    };
    if (Object.values(showChannelDropdown).some(open => open)) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showChannelDropdown]);

  const handleDayChange = (day, field, value) => {
    setDays(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
    setSaved(prev => ({ ...prev, [day]: false }));
  };

  const handleYogaToggle = (day, checked) => {
    setDays(prev => ({
      ...prev,
      [day]: { 
        ...prev[day], 
        yoga: checked,
        // Clear other filters when yoga is selected
        target: checked ? '' : prev[day].target,
        intensity: checked ? '' : prev[day].intensity,
        equipment: checked ? '' : prev[day].equipment,
        special_tag: checked ? '' : prev[day].special_tag,
        channels: checked ? [] : prev[day].channels
      }
    }));
    setSaved(prev => ({ ...prev, [day]: false }));
  };

  const handleChannelToggle = (day, channelName) => {
    setDays(prev => {
      const currentChannels = prev[day].channels || [];
      const newChannels = currentChannels.includes(channelName)
        ? currentChannels.filter(c => c !== channelName)
        : [...currentChannels, channelName];
      return {
        ...prev,
        [day]: { ...prev[day], channels: newChannels }
      };
    });
    setSaved(prev => ({ ...prev, [day]: false }));
  };

  const toggleChannelDropdown = (day) => {
    setShowChannelDropdown(prev => ({
      ...prev,
      [day]: !prev[day]
    }));
  };

  const handleClearDay = (day) => {
    setDays(prev => ({
      ...prev,
      [day]: { target: '', duration_min: '', duration_max: '', intensity: '', equipment: '', special_tag: '', channels: [], yoga: false }
    }));
    setSaved(prev => ({ ...prev, [day]: false }));
  };

  const handleGenerateWorkout = async (day) => {
    const dayFilters = days[day];
    
    // Check if it's a rest day (all fields blank and not yoga)
    const isRestDay = !dayFilters.yoga && 
                     !dayFilters.target && 
                     !dayFilters.duration_min && 
                     !dayFilters.duration_max && 
                     !dayFilters.intensity && 
                     !dayFilters.equipment &&
                     !dayFilters.special_tag &&
                     (!dayFilters.channels || dayFilters.channels.length === 0);
    
    if (isRestDay) {
      // Mark as rest day - clear any existing workout for this day
      setLoading(prev => ({ ...prev, [day]: true }));
      try {
        // Get current plan to find the ID if it exists
        let currentPlan = [];
        try {
          currentPlan = await getWeeklyPlan(weekStart);
        } catch (planError) {
          // If no plan exists yet, that's fine - just continue
          console.log('No existing plan found, creating rest day');
        }
        
        const existingDay = currentPlan.find(p => p.day_of_week === day);
        
        if (existingDay) {
          // Delete the existing workout to mark as rest day
          await deleteWeeklyPlanItem(existingDay.id);
        }
        
        setSaved(prev => ({ ...prev, [day]: true }));
        showToast(`${day} marked as rest day!`);
      } catch (error) {
        console.error('Error saving rest day:', error);
        showToast('Failed to save rest day: ' + (error.message || 'Unknown error'));
      } finally {
        setLoading(prev => ({ ...prev, [day]: false }));
      }
      return;
    }
    
    // For Yoga Day, no target needed
    // For regular workouts, target is optional - we can recommend any workout
    // Only require target if user specifically wants to filter by target
    
    setLoading(prev => ({ ...prev, [day]: true }));
    try {
      const recParams = {
        duration_min: dayFilters.duration_min || '',
        duration_max: dayFilters.duration_max || '',
        yoga: dayFilters.yoga ? 'true' : 'false'
      };
      
      // Only add filters if they're not empty and not yoga day
      if (!dayFilters.yoga) {
        if (dayFilters.target) recParams.target = dayFilters.target;
        if (dayFilters.intensity) recParams.intensity = dayFilters.intensity;
        if (dayFilters.equipment) recParams.equipment = dayFilters.equipment;
        if (dayFilters.special_tag) recParams.special_tag = dayFilters.special_tag;
        if (dayFilters.channels && dayFilters.channels.length > 0) {
          recParams.channels = dayFilters.channels;
        }
      }
      
      const recommendation = await getRecommendation(recParams);

      if (!recommendation || !recommendation.workout) {
        throw new Error('No workout recommendation received');
      }

      await saveWeeklyPlan(
        weekStart,
        day,
        recommendation.workout.workout_id,
        recommendation.warmup?.workout_id || null,
        recommendation.cooldown?.workout_id || null
      );

      setSaved(prev => {
        const newSaved = { ...prev, [day]: true };
        
        // Check if all days are saved or marked as rest days, then show playlist save option
        const allDaysHandled = dayNames.every(d => {
          if (d === day) return true; // Current day is now saved
          return newSaved[d] || (!days[d].yoga && !days[d].target && !days[d].duration_min && !days[d].intensity && !days[d].equipment && !days[d].special_tag && (!days[d].channels || days[d].channels.length === 0));
        });
        
        // no automatic playlist modal; header Create Playlist handles saving
        
        return newSaved;
      });
      
      showToast(`${day} workout saved!`);
    } catch (error) {
      console.error('Error generating workout:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      showToast('Failed to generate workout: ' + errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, [day]: false }));
    }
  };

  const getTodayDisplay = () => {
    try {
      const now = new Date();
      const options = { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'America/Chicago' };
      return now.toLocaleDateString('en-US', options);
    } catch (e) {
      return new Date().toLocaleDateString();
    }
  };

  const handleGenerateWeek = async () => {
    // Generate workouts for each day sequentially
    for (const day of dayNames) {
      // Skip if already saved
      if (saved[day]) continue;
      // await generation for each day
      // Small delay to avoid spamming API
      // eslint-disable-next-line no-await-in-loop
      await handleGenerateWorkout(day);
    }
  };

  const handleSavePlaylist = async () => {
    // kept for compatibility if called directly
    if (!playlistName.trim()) {
      showToast('Please enter a playlist name');
      return;
    }
    try {
      await createPlaylist(playlistName.trim(), weekStart);
      showToast('Playlist saved!');
      setPlaylistName('');
    } catch (error) {
      showToast('Failed to save playlist: ' + error.message);
    }
  };

  const handleCreatePlaylistPrompt = async () => {
    const name = window.prompt('Enter playlist name for this week:', 'My Week');
    if (!name || !name.trim()) return;
    try {
      await createPlaylist(name.trim(), weekStart);
      showToast('Playlist saved!');
    } catch (err) {
      showToast('Failed to save playlist: ' + (err.message || 'Unknown error'));
    }
  };

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleJumpToThisWeek = () => {
    // Navigate to Dashboard and set view mode to 'week'
    window.dispatchEvent(new CustomEvent('navigate-to-week'));
  };

  return (
    <div className="build-my-week">
      <div className="build-week-header">
        <div>
          <div className="mode-toggle">
            <button
              className={`mode-toggle-btn ${simpleMode ? 'active' : ''}`}
              onClick={() => {
                setSimpleMode(true);
                setAdvancedMode(false);
              }}
            >
              Simple
            </button>
            <button
              className={`mode-toggle-btn ${!simpleMode && !advancedMode ? 'active' : ''}`}
              onClick={() => {
                setSimpleMode(false);
                setAdvancedMode(false);
              }}
            >
              Basic
            </button>
            <button
              className={`mode-toggle-btn ${advancedMode ? 'active' : ''}`}
              onClick={() => {
                setSimpleMode(false);
                setAdvancedMode(true);
              }}
            >
              Advanced
            </button>
          </div>
        </div>
        <div className="header-right">
          <div className="today-display">Today: <strong>{getTodayDisplay()}</strong></div>
          <button className="btn-generate-week" onClick={handleGenerateWeek} title="Generate week for selected week">Generate Week</button>
          <button className="btn-generate-week" onClick={handleCreatePlaylistPrompt} title="Save week as playlist">Create Playlist</button>
          <button className="btn-jump-to-week" onClick={handleJumpToThisWeek} title="Jump to This Week view">
            Jump to This Week →
          </button>
        </div>
      </div>

      <div className="week-selector">
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
              }
            }}
            title="Select any date - it will automatically adjust to the Monday of that week"
          />
        <p className="build-week-instructions">
          Set your preferences for each day, then click <strong>Generate Week</strong>. Days without selections = Rest Days.
        </p>
      </div>

      {simpleMode && (
        <div className="days-container">
          {dayNames.map((day) => (
            <div key={day} className="day-card">
              <div className="day-card-header">
                <h3>{day}</h3>
                <button 
                  className="btn-clear-day" 
                  onClick={() => handleClearDay(day)}
                  title="Clear all selections for this day"
                >
                  ×
                </button>
              </div>

              <div className="yoga-day-toggle">
                <label>
                  <input
                    type="checkbox"
                    checked={days[day].yoga}
                    onChange={(e) => handleYogaToggle(day, e.target.checked)}
                  />
                  <span className="yoga-label">🧘 Yoga Day</span>
                </label>
              </div>
              
              <div className="day-filters">
                <div className="filter-group">
                  <label>Target Area {!days[day].yoga && '*'}</label>
                  <select
                    value={days[day].target}
                    onChange={(e) => handleDayChange(day, 'target', e.target.value)}
                    disabled={days[day].yoga}
                  >
                    <option value="">Select...</option>
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
                    value={days[day].intensity}
                    onChange={(e) => handleDayChange(day, 'intensity', e.target.value)}
                    disabled={days[day].yoga}
                  >
                    <option value="">Any</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              {saved[day] && (
                <div className="saved-indicator-block">✓ Workout Planned</div>
              )}
            </div>
          ))}
        </div>
      )}

      {!simpleMode && (
        <div className="days-container">
          {dayNames.map((day) => (
            <div key={day} className="day-card">
            <div className="day-card-header">
              <h3>{day}</h3>
              <button 
                className="btn-clear-day" 
                onClick={() => handleClearDay(day)}
                title="Clear all selections for this day"
              >
                ×
              </button>
            </div>
            
            <div className="yoga-day-toggle">
              <label>
                <input
                  type="checkbox"
                  checked={days[day].yoga}
                  onChange={(e) => handleYogaToggle(day, e.target.checked)}
                />
                <span className="yoga-label">🧘 Yoga Day</span>
              </label>
            </div>
            
            <div className="day-filters">
              <div className="filter-group">
                <label>Target Area {!days[day].yoga && '*'}</label>
                <select
                  value={days[day].target}
                  onChange={(e) => handleDayChange(day, 'target', e.target.value)}
                  disabled={days[day].yoga}
                >
                  <option value="">Select...</option>
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
                  value={days[day].intensity}
                  onChange={(e) => handleDayChange(day, 'intensity', e.target.value)}
                  disabled={days[day].yoga}
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
                  value={days[day].equipment}
                  onChange={(e) => handleDayChange(day, 'equipment', e.target.value)}
                  disabled={days[day].yoga}
                >
                  <option value="">Any</option>
                  <option value="none">None</option>
                  <option value="bands">Bands</option>
                  <option value="dumbbells">Dumbbells</option>
                </select>
              </div>

              {advancedMode && (
                <>
                  <div className="filter-group">
                    <label className="label-with-help">
                      Special Tag
                      <button
                        type="button"
                        className="help-button"
                        onClick={() => setShowSpecialTagHelp(true)}
                        title="Show available special tags"
                      >
                        ?
                      </button>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., HIIT, Pilates, etc."
                      value={days[day].special_tag}
                      onChange={(e) => handleDayChange(day, 'special_tag', e.target.value)}
                      disabled={days[day].yoga}
                    />
                  </div>

                  <div className="filter-group channel-filter-group">
                    <label>Channels</label>
                    <div className="channel-dropdown-container">
                      <button
                        type="button"
                        className="channel-dropdown-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleChannelDropdown(day);
                        }}
                        disabled={days[day].yoga}
                      >
                        {days[day].channels && days[day].channels.length > 0
                          ? `${days[day].channels.length} selected`
                          : 'Select channels...'}
                        <span className="dropdown-arrow">▼</span>
                      </button>
                      {showChannelDropdown[day] && !days[day].yoga && (
                        <div className="channel-dropdown" onClick={(e) => e.stopPropagation()}>
                          <div className="channel-dropdown-header">
                            <span>Select Channels</span>
                            <button
                              type="button"
                              className="channel-dropdown-close"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowChannelDropdown(prev => ({ ...prev, [day]: false }));
                              }}
                            >
                              ×
                            </button>
                          </div>
                          <div className="channel-checkbox-list">
                            {channels.map(channel => (
                              <label key={channel.channel_name} className="channel-checkbox-item">
                                <input
                                  type="checkbox"
                                  checked={days[day].channels?.includes(channel.channel_name) || false}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleChannelToggle(day, channel.channel_name);
                                  }}
                                />
                                <span>{channel.channel_name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              <div className="filter-group">
                <label>Duration (min)</label>
                <div className="duration-inputs">
                  <input
                    type="number"
                    placeholder="Min"
                    value={days[day].duration_min}
                    onChange={(e) => handleDayChange(day, 'duration_min', e.target.value)}
                  />
                  <span>to</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={days[day].duration_max}
                    onChange={(e) => handleDayChange(day, 'duration_max', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {saved[day] && (
              <div className="saved-indicator-block">✓ Workout Planned</div>
            )}
          </div>
        ))}
        </div>
      )}

      {/* Playlist modal removed - use header Create Playlist button */}

      {showSpecialTagHelp && (
        <div className="modal-overlay" onClick={() => setShowSpecialTagHelp(false)}>
          <div className="special-tag-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Available Special Tags</h3>
              <button
                className="modal-close"
                onClick={() => setShowSpecialTagHelp(false)}
                title="Close"
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <p>These are the available special tags you can use (from Lists → Targets):</p>
              <div className="special-tags-list">
                {specialTags.map(tag => (
                  <span key={tag} className="special-tag-item">{tag}</span>
                ))}
              </div>
              <p className="modal-note">Enter any of these tags in the Special Tag field to filter workouts.</p>
            </div>
            <div className="modal-footer">
              <button
                className="btn-modal-close"
                onClick={() => setShowSpecialTagHelp(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BuildMyWeek;

