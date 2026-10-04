# Full-video screening integration

The application does not implement known-CSAM detection. Connect a qualified
screening service and trained reviewers before enabling publication. Nothing
in the repository substitutes a general NSFW model or face-age estimate for
that service. With no service configured, scoring returns `score: null` and
`review_required`; archive publication and media playback remain gated.

Configure server-only `MODERATION_SERVICE_URL` (HTTPS) and
`MODERATION_SERVICE_TOKEN`. The endpoint is operator-controlled, never supplied
by an uploader. Requests use `POST`, Bearer authorization, original video bytes
as `application/octet-stream`, `X-Content-SHA256`, and `X-Moments-Policy`.
Redirects are refused and requests time out after 30 seconds. The service must
authenticate Moments, limit access, and handle original media under its own
approved retention and child-safety procedures. Do not send user media to an
unvetted endpoint.

The trusted service returns an exact-file receipt:

```json
{
  "contentHash": "SHA256_OF_THE_ORIGINAL_VIDEO",
  "policyVersion": "moments-safety-1",
  "provider": "YOUR_QUALIFIED_SCREENING_SERVICE",
  "screeningId": "SERVICE_AUDIT_RECEIPT_ID",
  "reviewedAt": "CURRENT_ISO_8601_UTC_TIMESTAMP",
  "coverage": "full-video",
  "knownCsamScreening": "completed",
  "contextScreening": "completed",
  "knownCsamMatch": false,
  "childSexualization": false,
  "childNudity": false,
  "childCompromisingSituation": false,
  "explicitSexualActivity": false,
  "graphicNudity": false,
  "nonConsensualContent": false,
  "childrenPresent": false,
  "ageUncertain": false,
  "consentUncertain": false,
  "decision": "approved"
}
```

These fields are a contract, not a claim that a vendor already supplies this
exact endpoint. An adapter must map its actual evidence into these decisions.
`completed` must mean actual qualified screening finished, never that the
generic model returned a low score. Ambiguous or unavailable results must
remain incomplete/review-required.

If children are present, approval additionally requires
`childSafetyHumanReview: "approved"` and a nonempty `reviewerId` from a trained,
authorized reviewer. Uncertain age or consent cannot be overridden by that
field. Unsafe flags block even when `decision` says approved. Missing booleans,
wrong hashes, outdated policies, sample-only coverage, and receipts older than
24 hours are never approvals. No client-provided receipt is accepted.

Local sampled-frame checks may send an otherwise approved receipt back to
review when they disagree. They cannot approve an unscreened video. No raw
video is placed in application Storage until screening and ranking pass.
Temporary decode files are removed in `finally`; media and credentials are not
written to application error logs. Blocked clips are not queued or archived
by this application. The specialist service owns review/escalation; Moments
does not yet implement a reviewer console, appeals, or reporting workflow.

Apply `20261004000000_moments_safety_gate.sql` before deploying this code. It
unpublishes old, unscreened entries without deleting their private media. The
database gate, leaderboard query, and playback query require the current
screening and scoring versions. Approved playback uses a 60-second signed
Storage URL; the bucket remains private. Revoking `published` or setting
moderation status to `blocked` stops new playback links; existing links expire
within 60 seconds.

Commercial release also needs a reviewed operational policy covering trained
reviewer access, incident escalation, retention, user reports, and appeals.
This repository change is not a production certification of the service.
