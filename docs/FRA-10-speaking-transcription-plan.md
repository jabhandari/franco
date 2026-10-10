# FRA-10: Speaking Transcription and Practice Feedback

## Summary

Add optional microphone recording to speaking exercises. Learners can record up to 60 seconds, preview the audio locally, explicitly submit it for transcription, and then see practice feedback.

- Existing open-ended DELF/DALF prompts show the French transcript without word scoring.
- Present or future read-aloud items containing an expected sentence also show matched, missed, and extra words.
- “Mark complete” remains separate and self-assessed. Transcription feedback never becomes a score.
- Audio exists only in browser/server memory and is never stored by Franco.
- The chosen transcript is stored in the completed attempt’s `response_json`.
- Per-user and global PostgreSQL quotas protect the shared Groq key across all API server instances.

## Groq Account and Environment Setup

1. Sign in or create an account in the [GroqCloud Console](https://console.groq.com).
2. Create separate `franco-dev` and `franco-prod` projects using Groq’s project selector. Projects provide separate keys, logs, and local caps, although they still share the organization ceiling. [Groq project documentation](https://console.groq.com/docs/projects).
3. Select `franco-dev`, visit [API Keys](https://console.groq.com/keys), create a key named `franco-dev-server`, and copy it when displayed.
4. Repeat for `franco-prod` before deployment. Only team owners or developer-role users can create keys.
5. Open [Data Controls](https://console.groq.com/settings/data-controls) and enable Zero Data Retention for inference. Groq says inference data can otherwise be temporarily retained for reliability or abuse investigations for up to 30 days; ZDR prevents that retention. [Groq data documentation](https://console.groq.com/docs/your-data).
6. Confirm the exact organization and project limits at [Groq Limits](https://console.groq.com/settings/limits). The published free Whisper limits at planning time were 20 requests/minute, 2,000 requests/day, 7,200 audio seconds/hour, and 28,800 audio seconds/day. Limits apply above individual application users. [Groq rate-limit documentation](https://console.groq.com/docs/rate-limits).
7. Put the development key in the server’s local `.env`. Never use a `VITE_` prefix:

```dotenv
GROQ_API_KEY=
GROQ_SPEECH_MODEL=whisper-large-v3-turbo
SPEECH_TRANSCRIPTION_ENABLED=true

SPEECH_MAX_SECONDS=60
SPEECH_MAX_BYTES=8388608
SPEECH_PROVIDER_TIMEOUT_MS=30000
SPEECH_MAX_CONCURRENT=4

SPEECH_USER_DAILY_REQUESTS=30
SPEECH_USER_DAILY_SECONDS=1800
SPEECH_GLOBAL_MINUTE_REQUESTS=18
SPEECH_GLOBAL_HOURLY_SECONDS=6480
SPEECH_GLOBAL_DAILY_REQUESTS=1800
SPEECH_GLOBAL_DAILY_SECONDS=25920
```

8. Add the same variables to the production backend’s secret/environment settings, using the production key. The key must never be configured in Vite or exposed to the browser.
9. Update `.gitignore` so `.env` and `.env.*` remain ignored while a blank `.env.example` can be committed.
10. Use Node 22.12 as documented by the project, install the new dependency, run the database migration, and start with `npm run dev`.

Use `whisper-large-v3-turbo`, `language=fr`, and temperature `0`. Groq listed Turbo at $0.04/audio hour at planning time, supports WebM, MP4, Ogg, WAV, and other common formats, and accepts 25 MB on the free tier. [Groq speech-to-text documentation](https://console.groq.com/docs/speech-to-text).

## Quota and Capacity Policy

Use 90% of the published provider limits so timing differences, other organization activity, and simultaneous requests do not take Franco directly to Groq’s ceiling.

| Window | Provider limit at planning time | Franco default |
|---|---:|---:|
| Global requests/minute | 20 | 18 |
| Global requests/day | 2,000 | 1,800 |
| Global audio/hour | 7,200 sec | 6,480 sec |
| Global audio/day | 28,800 sec | 25,920 sec |
| User requests/day | — | 30 |
| User audio/day | — | 1,800 sec |
| Recording length | Provider supports longer | 60 sec |
| Upload size | 25 MB free tier | 8 MB |

At maximum use, the current two users consume 60 requests and 3,600 audio seconds/day. The safe global audio pool can support 14 users each consuming all 30 one-minute recordings. Thirty recordings is a ceiling rather than guaranteed capacity: after the global pool fills, later requests receive a clear shared-capacity message.

If upgraded to paid usage, Turbo’s price at planning time makes 30 full one-minute recordings approximately $0.60/user/month. Two fully active users would be about $1.20/month. Groq bills a minimum of 10 seconds per request. Keep the application quotas active after upgrading and configure a monthly spend cap and alerts in [Billing Limits](https://console.groq.com/settings/billing/limits).

### Distributed enforcement

Add a `speech_transcriptions` table through a new idempotent Supabase migration and the startup migration:

- `id`, `user_id`, nullable `item_id`
- model and validated duration
- `pending`, `succeeded`, `no_speech`, or `provider_error` status
- provider request ID and safe error code
- transcript SHA-256, without plaintext transcript
- creation and completion timestamps
- indexes on `(user_id, created_at)` and `created_at`

Before contacting Groq:

1. Authenticate the learner and validate the content item.
2. Validate MIME type, payload size, and actual media duration.
3. Begin a PostgreSQL transaction and take a short transaction-level advisory lock for speech admission.
4. Count dispatched requests and audio seconds across the per-user daily, global minute, global rolling-hour, and global rolling-24-hour windows.
5. Check the number of pending calls against `SPEECH_MAX_CONCURRENT`.
6. Insert the pending usage row before releasing the transaction.
7. Send the request to Groq and update the row with its outcome.

All requests dispatched to Groq count against quota, including provider errors, because they may have consumed provider capacity. Validation failures do not count. PostgreSQL-backed admission prevents multiple server processes from independently oversubscribing the shared key.

Return stable `429` codes such as `speech_user_daily_limit`, `speech_global_minute_limit`, and `speech_global_daily_limit`, plus `Retry-After` where applicable. Propagate Groq `429` responses as `speech_provider_limited`; this covers organization activity that Franco’s database cannot see.

## Backend and API Changes

### Binary upload and provider call

Add an authenticated availability endpoint, GET /api/speech/status, returning whether transcription is enabled and the maximum recording length. The browser uses it to hide recording controls until the Groq key is configured.

Add:

```http
POST /api/speech/transcribe?item_id=<content-item-id>
Authorization: Bearer <Franco session token>
Content-Type: audio/webm;codecs=opus

<raw audio bytes>
```

Use a raw body instead of JSON or inbound multipart data. This keeps parsing small; the server constructs outbound `FormData` with Node 22’s native `fetch`, `Blob`, and `FormData`. No Groq SDK is required.

The route will:

- Authenticate before processing.
- Confirm the item exists and is a `speaking_prompt`.
- Accept browser-generated WebM/Opus, WebM, MP4, or Ogg audio.
- Stream into a bounded buffer, rejecting over 8 MB with `413`.
- Use `music-metadata` to determine actual duration, with a WebM block-timestamp fallback for browser recordings that omit duration metadata; reject corrupt, unknown-duration, or over-60-second audio before it reaches Groq.
- Submit to `https://api.groq.com/openai/v1/audio/transcriptions`.
- Set `language=fr`, `model=whisper-large-v3-turbo`, and a 30-second timeout.
- Avoid automatic retries because an ambiguous retry could consume provider quota twice.
- Never log audio bytes or transcript text.

Successful response:

```json
{
  "transcription_id": "uuid",
  "transcript": "Je m'appelle...",
  "duration_seconds": 18.4,
  "feedback": {
    "mode": "transcript_only"
  },
  "quota": {
    "user_requests_remaining_today": 29,
    "user_audio_seconds_remaining_today": 1781.6,
    "resets_at": "UTC timestamp"
  }
}
```

For an item with `response_json.expected`, return `feedback.mode: "word_diff"` plus expected and heard token arrays marked `matched`, `missed`, or `extra`.

Extend the JSON response helper to support `Retry-After` and stable error codes. Return:

- `400` for corrupt audio, invalid duration, or wrong item type
- `401` for a missing/expired Franco session
- `413` for oversized audio
- `415` for unsupported audio format
- `422` when no useful speech is detected
- `429` for local/provider capacity limits
- `502` for other Groq failures
- `503` when transcription is disabled or the key is absent

### Diff and grading behavior

Move the reusable speech comparison into the evaluation module:

- Reuse `normalizeTokens`.
- Normalize case, whitespace, French apostrophe variants, and surrounding punctuation.
- Use a longest-common-subsequence alignment so one omitted word does not make every following word appear incorrect.
- Preserve original words for display.
- Return alignments only, with no percentage, pass/fail, or pronunciation score.

Treat every `speaking_prompt` attempt as self-assessed regardless of whether it has an expected sentence. Continue returning `score: null` and preserve today’s completion/mastery behavior.

When the learner marks the exercise complete, submit:

```json
{
  "completed": true,
  "transcript": "Je m'appelle...",
  "transcription_id": "uuid"
}
```

The attempt endpoint verifies that the transcription ID belongs to the same learner and item and that the submitted transcript matches the stored SHA-256. It then stores the structured value in `learning_attempts.response_json`. Marking complete without recording stores `completed: true` and no transcript.

The existing progress API already returns recent attempts, so the transcript will be available for a later review UI. Adding a transcript-history interface is outside this ticket.

### Content convention

No data migration is needed for the six current speaking prompts. Their open-ended answers remain transcript-only. Authored, task-specific model phrases in `shared/speaking-lessons.js` add a separate guided practice step with server-selected word comparison. The highlighted words show what the transcription matched or missed, not pronunciation quality.

For future read-aloud content:

```json
{
  "response_json": {
    "expected": "Je voudrais réserver une table pour deux personnes."
  }
}
```

The server derives feedback mode from the presence of this field. The expected text always comes from server-side content rather than the browser.

## Frontend Experience

Update `src/components/exercises/WritingSpeaking.jsx` and the API client with the following state flow:

1. Check `window.isSecureContext`, `navigator.mediaDevices.getUserMedia`, and `MediaRecorder`.
2. Prefer `audio/webm;codecs=opus`; fall back to WebM, MP4, or Ogg using `MediaRecorder.isTypeSupported`.
3. Start recording only after a direct learner click and microphone permission.
4. Show an elapsed timer and automatically stop at 60 seconds.
5. Stop every microphone track immediately after recording or component unmount.
6. Keep the blob local and provide playback, “Discard,” and “Record again.”
7. Upload only after an explicit “Transcribe & check” click.
8. Revoke local object URLs after discard, replacement, submission cleanup, or unmount.
9. Render the transcript and label it “Practice feedback.”
10. For read-aloud content, show matched expected words, missed expected words, and extra heard words with accessible text/status labels in addition to color.
11. Keep “Mark complete” available throughout. It sends the latest accepted transcript if one exists.
12. Show remaining daily requests after a successful transcription.

Permission denial, an insecure origin, missing MediaRecorder support, exhausted quota, or provider failure must leave the original speaking prompt and “Mark complete” usable. Production must use HTTPS; localhost remains suitable for development.

Include a short disclosure before upload: the recording is sent to Groq for transcription, Franco does not retain the audio, and the transcript is saved only when the learner marks the exercise complete.

## Verification and Rollout

### Automated checks

Add Node tests for:

- Exact matches, omissions, insertions, repeated words, punctuation, capitalization, and French apostrophes in the word diff.
- Transcript-only behavior when no expected sentence exists.
- Structured speaking completion remaining self-assessed with `score: null`.
- MIME, empty-body, 8 MB, corrupt-media, and 60-second validation boundaries.
- User and global quota boundaries, window resets, concurrent admissions, and failed provider calls counting once.
- Authentication, wrong-item, provider `429`, timeout, and no-speech responses using a mocked provider.
- Ownership and transcript-hash validation when persisting an attempt.

Add a build-secret check that builds `dist/` and fails if it contains the actual `GROQ_API_KEY`, a `gsk_` key marker, or server-only environment names. The check must never print the secret.

### Browser acceptance

Verify in Chrome and Firefox, plus Safari if its MP4 MediaRecorder path is available:

- Permission granted, denied, and previously blocked.
- Manual stop and automatic stop at 60 seconds.
- Local playback before upload.
- No network request until “Transcribe & check.”
- Transcript-only feedback on current open-ended prompts.
- Word diff on a fixture item with `response_json.expected`.
- Completing with and without a transcript.
- Refreshing Progress confirms the transcript exists in the stored attempt.
- Microphone indicator ends after stop, navigation, and unmount.
- HTTPS production operation and localhost development operation.

### Rollout sequence

1. Merge the migration, endpoint, UI, tests, documentation, and blank environment example with transcription disabled by default.
2. Create the Groq development project/key and enable ZDR.
3. Run the migration in the Supabase SQL Editor or via the project’s migration process.
4. Enable transcription locally and complete the automated/browser checks.
5. Create the production project/key and add server-only production environment values.
6. Confirm the production proxy allows 8 MB request bodies and at least a 30-second upstream timeout.
7. Deploy over HTTPS, enable the feature for both current users, and inspect Groq Usage plus `speech_transcriptions` after normal use.
8. Recheck the live Groq Limits page before increasing users or quotas. Upgrade or lower the per-user allowance before sustained demand approaches the global audio pool.
