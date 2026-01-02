import React, { useState, useEffect } from 'react';
import { getChannels } from '../api';
import './Channels.css';

function Channels() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    setLoading(true);
    try {
      const data = await getChannels();
      const sorted = [...data].sort((a, b) => a.channel_name.localeCompare(b.channel_name));
      setChannels(sorted);
    } catch (error) {
      console.error('Failed to load channels:', error);
    } finally {
      setLoading(false);
    }
  };

  // Map channel names to display names and URLs from channels.csv
  const channelInfo = {
    'Caroline Girvan': {
      url: 'https://www.youtube.com/@CarolineGirvan',
      displayName: 'Caroline Girvan'
    },
    'fitbymik': {
      url: 'https://www.youtube.com/@fitbymik',
      displayName: 'fitbymik'
    },
    'growingannanas': {
      url: 'https://www.youtube.com/@growingannanas',
      displayName: 'growingannanas'
    },
    'Heather Robinson': {
      url: 'https://www.youtube.com/@Heatherrobertsoncom',
      displayName: 'Heather Robinson'
    },
    'Juice & Toya': {
      url: 'https://www.youtube.com/@JuiceandToya',
      displayName: 'Juice & Toya'
    },
    'mobility by julia reppel': {
      url: 'https://www.youtube.com/@julia.reppel',
      displayName: 'Julia Reppel'
    },
    'madfit': {
      url: 'https://www.youtube.com/@MadFit',
      displayName: 'MadFit'
    },
    'Mady Morrison': {
      url: 'https://www.youtube.com/@madymorrison',
      displayName: 'Mady Morrison'
    },
    'miDASMVMT': {
      url: 'https://www.youtube.com/@midasmvmt',
      displayName: 'miDASMVMT'
    },
    'MonikaFit': {
      url: 'https://www.youtube.com/@MonikaFitt',
      displayName: 'MonikaFit'
    },
    'Yoga With Nancy': {
      url: 'https://www.youtube.com/@NancySidhuYoga',
      displayName: 'Nancy Sidhu'
    },
    'Oliver Sjostrom': {
      url: 'https://www.youtube.com/@OliverSjostrom',
      displayName: 'Oliver Sjostrom'
    },
    'Strength Side': {
      url: 'https://www.youtube.com/@Strengthside',
      displayName: 'Strength Side'
    },
    'Valery Ortiz': {
      url: 'https://www.youtube.com/@TheValeryOrtiz',
      displayName: 'Valery Ortiz'
    },
    'TIFF x DAN': {
      url: 'https://www.youtube.com/@TIFFxDAN',
      displayName: 'TIFF x DAN'
    },
    'Tolu Oshonowo': {
      url: 'https://www.youtube.com/@ToluOshonowo',
      displayName: 'Tolu Oshonowo'
    },
    'GainsByBrains': {
      url: 'https://www.youtube.com/@TRAINWITHGAINSBYBRAINS',
      displayName: 'GainsByBrains'
    },
    'Yoga With Adriene': {
      url: 'https://www.youtube.com/@yogawithadriene',
      displayName: 'Adriene Mishler'
    },
    'Yoga With Bird': {
      url: 'https://www.youtube.com/@YogaWithBird',
      displayName: 'Yoga With Bird'
    }
  };

  // Build a prioritized list of possible trainer image paths.
  // Prefer the explicit YouTube handle extracted from the known channel URL
  // (e.g. https://www.youtube.com/@Heatherrobertsoncom -> Heatherrobertsoncom).
  // If no handle is available, fall back to the channel_name from the DB.
  const getImageCandidates = (channelObj, info = {}) => {
    let raw = '';

    // Prefer handle from known channel URL (captures things like 'julia.reppel')
    if (info && info.url) {
      const match = info.url.match(/@([^/?#&]+)/);
      if (match) raw = match[1];
    }

    // Fallback to provided channel object/name
    if (!raw && channelObj) {
      if (typeof channelObj === 'string') raw = channelObj;
      else if (channelObj.channel_name) raw = channelObj.channel_name;
    }

    raw = (raw || '').replace(/^@/, '').trim();

    // Build filename variants to handle different naming styles users might use:
    // - preserve dots (julia.reppel)
    // - remove punctuation (juliareppel)
    // - lowercase variants
    // - display-name without spaces/punctuation
    const variants = [];
    if (raw) {
      // preserve original (may include dots)
      variants.push(raw);
      // allow dots only (remove other punctuation)
      variants.push(raw.replace(/[^a-zA-Z0-9.]/g, ''));
      // remove dots entirely
      variants.push(raw.replace(/\./g, ''));
      // lowercase variants
      variants.push(raw.toLowerCase());
      variants.push(raw.toLowerCase().replace(/[^a-z0-9.]/g, ''));
      variants.push(raw.toLowerCase().replace(/\./g, ''));
    }

    // Also add a variant derived from the display name (no spaces/punctuation)
    if (channelObj && typeof channelObj === 'object' && channelObj.channel_name) {
      const dn = channelObj.channel_name.replace(/\s+/g, '').replace(/[^a-zA-Z0-9.]/g, '');
      variants.push(dn);
      variants.push(dn.toLowerCase());
    }

    // Dedupe while preserving order
    const seen = new Set();
    const ordered = [];
    for (const v of variants) {
      if (!v) continue;
      if (!seen.has(v)) {
        seen.add(v);
        ordered.push(v);
      }
    }

    const exts = ['png', 'jpg', 'jpeg', 'webp', 'svg'];
    const paths = [];
    for (const name of ordered) {
      for (const ext of exts) {
        paths.push(`/img/trainers/${name}.${ext}`);
      }
    }

    return paths;
  };


  const getChannelInfo = (channelName) => {
    return channelInfo[channelName] || {
      url: '#',
      displayName: channelName
    };
  };

  return (
    <div className="channels">
      <h2>Trainers</h2>
      <p className="channels-intro">
        Meet the amazing trainers whose workouts power YouTubeFit. Click on any trainer to visit their YouTube channel.
      </p>

      {loading ? (
        <div className="loading">Loading trainers...</div>
      ) : (
        <div className="trainers-grid">
          {channels.map((channel) => {
            const info = getChannelInfo(channel.channel_name);
            const candidates = getImageCandidates(channel, info);
            const firstSrc = candidates[0];

            return (
              <div key={channel.channel_name} className="trainer-card">
                <a
                  href={info.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="trainer-link"
                >
                  <div className="trainer-image-container">
                    <img
                      src={firstSrc}
                      data-idx="0"
                      alt={info.displayName}
                      className="trainer-image"
                      onError={(e) => {
                        const img = e.target;
                        const idx = parseInt(img.dataset.idx || '0', 10);
                        const nextIdx = idx + 1;
                        if (nextIdx < candidates.length) {
                          img.dataset.idx = String(nextIdx);
                          img.src = candidates[nextIdx];
                        } else {
                          img.style.display = 'none';
                          const container = img.parentElement;
                          if (container && !container.querySelector('.trainer-placeholder')) {
                            const placeholder = document.createElement('div');
                            placeholder.className = 'trainer-placeholder';
                            placeholder.textContent = info.displayName.charAt(0).toUpperCase();
                            container.appendChild(placeholder);
                          }
                        }
                      }}
                    />
                  </div>
                  <div className="trainer-info">
                    <h3 className="trainer-name">{info.displayName}</h3>
                    <p className="trainer-workouts">{channel.workout_count} workout{channel.workout_count !== 1 ? 's' : ''}</p>
                    <div className="trainer-bio">
                      <p>Click to visit their YouTube channel and explore their full library of workouts.</p>
                    </div>
                  </div>
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Channels;
