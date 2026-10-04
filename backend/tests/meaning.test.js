const {test} = require('node:test');
const assert = require('node:assert/strict');
const {rankMeaning, summarizeConcepts} = require('../src/meaning');

function values(overrides = {}) {
  return {care: 0.7, connection: 0.75, wonder: 0.7, presence: 0.85,
    display: 0.2, spectacle: 0.2, sexualization: 0.1, affection: 0.6, ...overrides};
}
function rank(overrides) {return rankMeaning({values: values(overrides)});}

test('quiet care ranks above an otherwise identical status display', () => {
  const ordinary = rank({});
  const display = rank({display: 0.95, spectacle: 0.95});
  assert.ok(ordinary.score > display.score);
  assert.equal(display.eligibleForLeaderboard, false);
  assert.ok(display.penalties.display > 0);
});
test('nature and solitude can rank without faces or smiles', () => {
  const nature = rank({care: 0.15, connection: 0.1, wonder: 0.95, presence: 0.9});
  assert.ok(nature.score > 70);
  assert.equal(nature.eligibleForLeaderboard, true);
});
test('affection softens a mild framing penalty but does not rescue strong sexualization', () => {
  assert.ok(rank({sexualization: 0.65, affection: 0.95}).score > rank({sexualization: 0.65, affection: 0.2}).score);
  assert.equal(rank({sexualization: 0.95, affection: 1}).eligibleForLeaderboard, false);
});
test('known scoring inputs do not reward saturation, expensive equipment, or follower count', () => {
  const ordinary = rank({});
  const extra = rankMeaning({values: {...values(), saturation: 1, cameraPrice: 10000, followers: 1e6, faceCount: 5}});
  assert.equal(ordinary.score, extra.score);
});
test('brief sexualized frame cannot vanish into an average', () => {
  const frames = Array.from({length: 5}, () => values());
  frames[1].sexualization = 0.95;
  assert.equal(rankMeaning(summarizeConcepts(frames)).eligibleForLeaderboard, false);
});
test('incomplete or nonfinite observations produce no fabricated score', () => {
  assert.throws(() => summarizeConcepts([]), /incomplete/);
  assert.throws(() => summarizeConcepts([values({care: NaN})]), /incomplete/);
  assert.throws(() => rankMeaning({values: values({presence: Infinity})}), /incomplete/);
});
