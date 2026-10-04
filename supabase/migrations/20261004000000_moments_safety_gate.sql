-- Existing entries have not passed this policy and remain private/unranked.
alter table public.moments
  add column moderation_status text not null default 'review_required'
    check (moderation_status in ('review_required', 'approved', 'blocked')),
  add column moderation_policy_version text,
  add column moderation_evidence jsonb not null default '{}'::jsonb,
  add column content_hash text,
  add column scoring_version text;

alter table public.moments alter column published set default false;
update public.moments set published = false;

alter table public.moments add constraint moments_publication_safety_gate check (
  not published or (
    moderation_status = 'approved'
    and moderation_policy_version = 'moments-safety-1'
    and scoring_version = 'moments-purity-1'
    and content_hash ~ '^[0-9a-f]{64}$'
    and moderation_evidence->>'status' = 'approved'
    and moderation_evidence->>'policyVersion' = moderation_policy_version
    and moderation_evidence->>'contentHash' = content_hash
    and moderation_evidence->>'eligibleForLeaderboard' = 'true'
    and coalesce(moderation_evidence->>'screeningId', '') <> ''
  ) is true
);

create index moments_screened_leaderboard_idx
  on public.moments (score desc, created_at asc)
  where published = true and moderation_status = 'approved';

comment on column public.moments.moderation_evidence is
  'Server-owned screening receipt bound to media SHA-256; never client-provided.';

-- Retain private access. Do not introduce public Storage or table policies.
update storage.buckets set allowed_mime_types = array[
  'video/mp4', 'video/quicktime', 'video/webm'
] where id = 'moments-media';
