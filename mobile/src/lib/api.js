export const defaultCommunityLeaderboard = [
  {
    id: 'featured-quiet-morning',
    username: 'QuietSignal',
    title: 'Christmas kitchen at 7:12',
    score: 94.2,
    summary:
      'A short, unforced family exchange held warmth across the tape instead of playing to the camera.',
    source: 'Featured',
  },
  {
    id: 'featured-parking-lot',
    username: 'TapeArchive',
    title: 'Creek water in July',
    score: 91.7,
    summary:
      'Shared motion, laughter, and place made the clip feel lived rather than arranged.',
    source: 'Featured',
  },
  {
    id: 'featured-porch',
    username: 'HumanVoltage',
    title: 'Last light from the porch',
    score: 88.6,
    summary:
      'Quiet atmosphere carried the tape without needing spectacle or expensive things.',
    source: 'Featured',
  },
];

export function normalizeApiBaseUrl(value) {
  return (value || '').trim().replace(/\/+$/, '');
}

function isVideoAsset(asset) {
  return Boolean(
    asset &&
      ((asset.type && asset.type.toLowerCase().startsWith('video/')) ||
        Number(asset.duration) > 0),
  );
}

export async function scoreMoment({asset, apiBaseUrl, username}) {
  const normalizedBaseUrl = normalizeApiBaseUrl(apiBaseUrl);
  if (!normalizedBaseUrl) {
    throw new Error('Set a backend URL before scoring a moment.');
  }

  if (!isVideoAsset(asset)) {
    throw new Error('Moments accepts 3–5 second video clips only.');
  }

  const endpoint = 'score-video';
  const formData = new FormData();
  formData.append('file', {
    uri: asset.uri,
    type: asset.type || 'video/mp4',
    name:
      asset.fileName ||
      `moment-${Date.now()}.mp4`,
  });
  formData.append('username', username || 'ArchiveKeeper');

  const response = await fetch(`${normalizedBaseUrl}/${endpoint}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
    body: formData,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      payload && payload.error
        ? payload.error
        : `The scoring service responded with ${response.status}.`,
    );
  }

  if (!payload || typeof payload.score !== 'number') {
    throw new Error('The scoring service returned an invalid response.');
  }

  return payload;
}

export async function archiveMoment({
  accessToken,
  apiBaseUrl,
  clientId,
  moment,
  username,
}) {
  const normalizedBaseUrl = normalizeApiBaseUrl(apiBaseUrl);
  if (!normalizedBaseUrl) {
    throw new Error('Set a backend URL before archiving a moment.');
  }

  const isVideo = moment.mediaType === 'video';
  if (!isVideo) {
    throw new Error('Only 3–5 second clips can be archived.');
  }
  const formData = new FormData();
  formData.append('file', {
    uri: moment.uri,
    type: moment.mimeType || 'video/mp4',
    name:
      moment.fileName ||
      `moment-${Date.now()}.mp4`,
  });
  formData.append('username', username || 'ArchiveKeeper');
  formData.append('clientId', clientId || 'anonymous');

  const response = await fetch(`${normalizedBaseUrl}/moments`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(accessToken ? {Authorization: `Bearer ${accessToken}`} : {}),
    },
    body: formData,
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      payload && payload.error
        ? payload.error
        : `Cloud archive responded with ${response.status}.`,
    );
  }

  if (!payload || !payload.archive || !payload.archive.id) {
    throw new Error('The cloud archive returned an invalid response.');
  }

  return payload;
}

export async function fetchLeaderboard(apiBaseUrl) {
  const normalizedBaseUrl = normalizeApiBaseUrl(apiBaseUrl);
  if (!normalizedBaseUrl) {
    return defaultCommunityLeaderboard;
  }

  const response = await fetch(`${normalizedBaseUrl}/leaderboard`, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Leaderboard request failed with ${response.status}.`);
  }

  const payload = await response.json();
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.entries)) {
    return payload.entries;
  }

  return defaultCommunityLeaderboard;
}
