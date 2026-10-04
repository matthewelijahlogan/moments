# What Moments means by purity

Moments collects two-to-four-second glimpses of what makes life meaningful. The
board ranks clips, never the moral worth of people. A grade is an interpretation
of visible evidence, not proof of love, authenticity, arrogance, or intent.

## What earns a grade

- Care: helping, comforting, tending, and small acts of generosity.
- Connection: shared attention and tender, non-explicit affection.
- Wonder: nature, discovery, animals, and ordinary things worth noticing.
- Presence: an everyday scene observed without turning it into a performance.
- Simplicity: context without status display or staged spectacle.

A quiet landscape or a solitary act can rank as highly as a human interaction.
Smiles, faces, expensive cameras, bright colors, luxury possessions, follower
counts, and likes earn no automatic bonus. Ordinary use of an object differs
from framing it as a trophy. Naturally vivid scenery differs from gaudy staging.

## Version 1 computation

`meaning.js` runs a pinned local CLIP model against paired descriptions across
five full-composition samples, including both ends and the middle of the clip.
The care, connection, and wonder cues compete on equal terms: the strongest
contributes 50%, the average of the strongest two contributes 30%, and presence
contributes 20%. This avoids making faces a prerequisite for meaning.

Only evidence above the paired-description midpoint incurs framing penalties:
up to 25 points for display, 12 for spectacle, and 30 for sexualization. Tender
affection can reduce the sexualization framing penalty by at most 35%, after
safety approval. A strong display/spectacle or sexualization cue (0.8 or higher)
keeps the clip off the leaderboard even if positive cues produce a high grade.

These are relative model similarities, not calibrated probabilities. The
weights and thresholds are an experimental, versioned product rubric. They
must be assessed with human-rated clips before commercial launch.

## Safety is independent

No purity grade or claim of love overrides screening. Known or suspected child
sexual exploitation, sexualized children, child nudity, compromising child
situations, nonconsensual content, explicit sexual activity, and graphic nudity
cannot be published. Uncertain ages or consent remain unranked. Even ordinary
child footage needs a trained human child-safety review before publication.

NSFWJS is a secondary generic sexual-content check. It is not a child-safety,
age, consent, or known-CSAM detector. The separate screening integration must
cover the entire original video, including relevant audio and context, and
perform qualified known-content screening. No configured/completed screening
means no grade and no publication. The application has no unreviewed override.

## Evaluate before launch

Use consented, non-explicit test clips rated independently by multiple people:
ordinary care, quiet nature, solitary moments, artistic/vivid scenes, everyday
objects, and staged display. Compare pairwise human preferences, disagreement,
and false exclusions across skin tones, clothing, cultures, camera quality,
disability, and lighting. Test non-explicit adult affection separately from
sexualized framing. Keep model evaluation data separate from screening review.

Exercise child-safety decisions using synthetic metadata and authorized
provider test fixtures; do not collect abusive material for application tests.
Automated scores need a moderation escalation and appeal process. Tests of
policy branches do not establish detector accuracy or an absence of false
negatives. This release adds the gate and scoring foundation, not a guarantee
that automated moderation can eliminate all harmful content.
