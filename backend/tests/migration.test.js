const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {PGlite} = require('@electric-sql/pglite');

test('Postgres migration unpublishes old entries and enforces the safety receipt', async () => {
  const db = new PGlite();
  try {
    // Storage is a Supabase-owned schema. Provide its table shape locally;
    // gen_random_uuid is built into this Postgres without a pgcrypto extension.
    await db.exec(`create schema storage; create table storage.buckets (
      id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);`);
    const migrations = path.resolve(__dirname, '../../supabase/migrations');
    const original = (await fs.readFile(path.join(migrations, '20260728000000_create_moments_archive.sql'), 'utf8'))
      .replace('create extension if not exists pgcrypto;', '');
    await db.exec(original);
    await db.exec(`insert into public.moments(client_id, username, media_type, storage_path, score, tier, title, summary)
      values ('test', 'Keeper', 'video', 'private/test.mp4', 90, 'Test', 'Test', 'Test');`);
    await db.exec(await fs.readFile(path.join(migrations, '20261004000000_moments_safety_gate.sql'), 'utf8'));
    assert.equal((await db.query('select published from public.moments')).rows[0].published, false);
    await assert.rejects(db.exec('update public.moments set published = true'), /moments_publication_safety_gate/);
    await assert.rejects(db.exec("update public.moments set published = true, moderation_status = 'approved'"), /moments_publication_safety_gate/);
    const hash = 'a'.repeat(64);
    const evidence = {status: 'approved', policyVersion: 'moments-safety-1', contentHash: hash,
      eligibleForLeaderboard: true, screeningId: 'test-receipt'};
    await db.query(`update public.moments set moderation_status = 'approved',
      moderation_policy_version = 'moments-safety-1', scoring_version = 'moments-purity-1',
      content_hash = $1, moderation_evidence = $2::jsonb, published = true`, [hash, JSON.stringify(evidence)]);
    assert.equal((await db.query('select published from public.moments')).rows[0].published, true);
    await assert.rejects(db.exec("update public.moments set moderation_status = 'blocked'"), /moments_publication_safety_gate/);
    await assert.rejects(db.exec("update public.moments set moderation_evidence = '{}'::jsonb"), /moments_publication_safety_gate/);
    await db.exec("update public.moments set published = false, moderation_status = 'blocked'");
    assert.equal((await db.query('select published from public.moments')).rows[0].published, false);
  } finally {
    await db.close();
  }
});
