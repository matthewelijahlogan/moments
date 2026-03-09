export const defaultCommunityLeaderboard = [
  {
    id: 'featured-quiet-morning',
    username: 'QuietSignal',
    title: 'Kitchen light at 7:12',
    score: 94.2,
    summary:
      'High warmth and calm contrast made this read like a lived-in memory instead of a staged shot.',
    source: 'Featured',
  },
  {
    id: 'featured-parking-lot',
    username: 'TapeArchive',
    title: 'Rain on the lot',
    score: 91.7,
    summary:
      'The frame held strong atmosphere and visual tension, which pushed the meaning score above pure aesthetics.',
    source: 'Featured',
  },
  {
    id: 'featured-porch',
    username: 'HumanVoltage',
    title: 'Shoes on the porch',
    score: 88.6,
    summary:
      'Intimacy and narrative residue carried the image even though the composition stayed understated.',
    source: 'Featured',
  },
];

export function normalizeApiBaseUrl(value) {
  return (value || '').trim().replace(/\/+$/, '');
}

export async function scoreImage({asset, apiBaseUrl, username}) {
  const normalizedBaseUrl = normalizeApiBaseUrl(apiBaseUrl);
  if (!normalizedBaseUrl) {
    throw new Error('Set a backend URL before scoring a moment.');
  }

  const formData = new FormData();
  formData.append('file', {
    uri: asset.uri,
    type: asset.type || 'image/jpeg',
    name: asset.fileName || `moment-${Date.now()}.jpg`,
  });
  formData.append('username', username || 'ArchiveKeeper');

  const response = await fetch(`${normalizedBaseUrl}/score-image`, {
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
