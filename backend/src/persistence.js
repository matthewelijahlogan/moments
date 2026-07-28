const crypto = require('crypto');
const path = require('path');
const {createClient} = require('@supabase/supabase-js');

const DEFAULT_BUCKET = 'moments-media';
const MAX_LEADERBOARD_SIZE = 100;

let client;

function isPersistenceConfigured() {
  return Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

function getClient() {
  if (!isPersistenceConfigured()) {
    return null;
  }

  if (!client) {
    client = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  return client;
}

function normalizeUsername(value) {
  const normalized = String(value || 'ArchiveKeeper')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 40);

  return normalized || 'ArchiveKeeper';
}

function normalizeClientId(value) {
  return String(value || 'anonymous')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 80) || 'anonymous';
}

function extensionForFile(file) {
  const originalExtension = path.extname(file.originalname || '')
    .toLowerCase()
    .replace(/[^.a-z0-9]/g, '');

  if (originalExtension && originalExtension.length <= 8) {
    return originalExtension;
  }

  const extensionsByMimeType = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'video/mp4': '.mp4',
    'video/quicktime': '.mov',
  };

  return extensionsByMimeType[file.mimetype] || '';
}

function serializeLeaderboardRow(row) {
  return {
    id: row.id,
    username: row.username,
    title: row.title,
    score: Number(row.score),
    summary: row.summary,
    tier: row.tier,
    medium: row.media_type,
    createdAt: row.created_at,
    source: 'Community',
  };
}

async function listLeaderboard(limit = 50) {
  const supabase = getClient();
  if (!supabase) {
    return null;
  }

  const safeLimit = Math.min(
    Math.max(Number.parseInt(limit, 10) || 50, 1),
    MAX_LEADERBOARD_SIZE,
  );
  const {data, error} = await supabase
    .from('moments')
    .select(
      'id, username, title, score, summary, tier, media_type, created_at',
    )
    .eq('published', true)
    .order('score', {ascending: false})
    .order('created_at', {ascending: true})
    .limit(safeLimit);

  if (error) {
    throw error;
  }

  return (data || []).map(serializeLeaderboardRow);
}

async function archiveMoment({analysis, clientId, file, username}) {
  const supabase = getClient();
  if (!supabase) {
    const error = new Error('Cloud archive is not configured.');
    error.statusCode = 503;
    throw error;
  }

  const bucket = process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET;
  const ownerKey = normalizeClientId(clientId);
  const objectPath = `${ownerKey}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}${extensionForFile(file)}`;
  const {error: uploadError} = await supabase.storage
    .from(bucket)
    .upload(objectPath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const record = {
    client_id: ownerKey,
    username: normalizeUsername(username),
    media_type: analysis.medium || 'video',
    storage_path: objectPath,
    score: analysis.score,
    tier: analysis.tier,
    title: analysis.title,
    summary: analysis.summary,
    dimensions: analysis.dimensions,
    signals: analysis.signals,
    explanation: analysis.explanation,
    clip_duration_seconds: analysis.clipDurationSeconds || null,
    published: true,
  };
  const {data, error: insertError} = await supabase
    .from('moments')
    .insert(record)
    .select(
      'id, username, title, score, summary, tier, media_type, created_at',
    )
    .single();

  if (insertError) {
    await supabase.storage.from(bucket).remove([objectPath]).catch(() => {});
    throw insertError;
  }

  return serializeLeaderboardRow(data);
}

module.exports = {
  archiveMoment,
  isPersistenceConfigured,
  listLeaderboard,
  normalizeClientId,
  normalizeUsername,
};
