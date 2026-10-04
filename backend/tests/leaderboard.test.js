const {test} = require('node:test');
const assert = require('node:assert/strict');
const {listLeaderboard, getPublishedVideoUrl} = require('../src/persistence');
const {POLICY_VERSION} = require('../src/moderation');
const {ENGINE_VERSION} = require('../src/meaning');

const approvedId = '10000000-0000-0000-0000-000000000001';
const blockedId = '10000000-0000-0000-0000-000000000002';
const unreviewedId = '10000000-0000-0000-0000-000000000003';
function database() {
  const baseline = {published: true, moderation_status: 'approved', moderation_policy_version: POLICY_VERSION,
    scoring_version: ENGINE_VERSION, score: 88, username: 'Keeper', storage_path: 'private/approved.mp4'};
  const rows = [{...baseline, id: approvedId}, {...baseline, id: blockedId, moderation_status: 'blocked'},
    {...baseline, id: unreviewedId, moderation_status: 'review_required'},
    {...baseline, id: '10000000-0000-0000-0000-000000000004', published: false},
    {...baseline, id: '10000000-0000-0000-0000-000000000005', moderation_policy_version: 'old-policy'},
    {...baseline, id: '10000000-0000-0000-0000-000000000006', scoring_version: 'old-scoring'}];
  const links = [];
  return {links, from: () => {
    let selected = [...rows];
    const query = {select: () => query, order: () => query,
      eq: (key, value) => {selected = selected.filter(row => row[key] === value); return query;},
      limit: async n => ({data: selected.slice(0, n), error: null}),
      maybeSingle: async () => ({data: selected[0] || null, error: null})};
    return query;
  }, storage: {from: () => ({createSignedUrl: async (path, seconds) => {
    links.push({path, seconds}); return {data: {signedUrl: 'https://storage.example.invalid/signed-test'}};
  }})}};
}

test('only current-policy approved published clips enter the board', async () => {
  const entries = await listLeaderboard(50, database());
  assert.deepEqual(entries.map(entry => entry.id), [approvedId]);
  assert.equal(entries[0].videoUrl, `/moments/${approvedId}/video`);
});
test('unreviewed and blocked clips never receive a playback link', async () => {
  const db = database();
  for (const id of [blockedId, unreviewedId, '10000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000006']) {
    assert.equal(await getPublishedVideoUrl(id, db), null);
  }
  assert.equal(db.links.length, 0);
  assert.ok(await getPublishedVideoUrl(approvedId, db));
  assert.deepEqual(db.links, [{path: 'private/approved.mp4', seconds: 60}]);
});
