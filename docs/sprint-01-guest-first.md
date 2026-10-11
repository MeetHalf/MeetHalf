# Sprint 01: guest-first experience

## Architecture audit

- React/TypeScript/Vite with MUI. `src/router.tsx` previously redirected `/` to `/events`; `LoadingRoute` waits for auth but does not require login. A stale unused `Social` import referenced a missing file; this sprint removes that import, preserving `/social` → `/friends`.
- `/events/new` is already public. `CreateEvent` combines scheduling, nickname, browser Places autocomplete, friend invitations and temporary midpoint search in one large form. Anonymous creation supplies an owner ID and stores the returned member/guest token per event in localStorage. New finder results initialize the existing form with a selected place; no second creation implementation is introduced. Location sharing now starts unchecked and requires an explicit choice.
- `/events/:id` still renders `EventDetail`/`EventRoom`; `/invite/:token` resolves public invitation links. Event-scoped Bearer guest tokens are added by the existing Axios interceptor. Tracking, arrival and chat components are unchanged. JWT account authentication and guest member authentication remain separate; no fake account/session is created for searching.
- Express exposes public `GET /maps/geocode` and `POST /events/calculate-midpoint`. The temporary calculation uses a geographic average, reverse geocoding, Directions estimates **to that average**, and nearby Places. It is not a travel-time optimizer. Failures can return HTTP 200 with partial/empty results. The new UI states these limits and reports unavailable times/recommendations rather than claiming optimal travel times.
- A separate event-scoped `midpoint_by_time` implementation iteratively evaluates times/candidates, but depends on persisted event members. It cannot be used directly before creating an event. No algorithm rewrite is included here.
- Prisma uses PostgreSQL. Events already support anonymous string owner IDs and members; no migration is needed for this sprint's stateless search or existing guest creation.

## Implemented flow

`/` → `/find` → enter 2–10 departure addresses and individual travel modes → geocode through the backend → existing temporary midpoint endpoint → display nearby places and available midpoint travel times → choose a place → `/events/new` with location prefilled → existing event/invitation workflow.

Both landing and finder are public and do not wait for account authentication. Landing retains optional login and returning-user event navigation. Existing event, invitation, tracking, social and authenticated routes are preserved. No new dependencies or production environment changes.

Finder input changes clear stale results; input controls are disabled while requests run; errors are retryable. No database row is created by a recommendation search. Addresses are sent to Google through the backend; they are not stored by this UI. Existing process caches/logging still apply.

## Backend/database follow-up for true guest-first coordination

1. Extract the event-scoped time optimizer into a service accepting ephemeral departures, per-person modes, objective and meeting/departure time. Expose a public, validated endpoint and return travel times **per recommended destination**, with explicit partial-failure status. No database migration is inherently required for this stateless operation.
2. Add rate limits, participant bounds, cost budgets and coordinate validation to public recommendation endpoints. `/maps` has rate limiting, but `POST /events/calculate-midpoint` does not. Existing `trust proxy: true` causes express-rate-limit's permissive-proxy warning locally and needs deployment-specific hardening.
3. Anonymous `ownerId` is client-generated and is also accepted from request bodies for edits; this is not proof of ownership. Use a server-issued capability tied to owner/member/event, enforce it for editing, sharing and deleting, and test privilege separation. Public GET event responses currently include owner/member identifiers; review privacy before broader launch.
4. Guest create already generates a member JWT, but share-token handlers assume account `userId`. Investigate/extend verified guest-owner/member authorization; the existing create screen falls back to a direct event URL. Do not require OAuth solely to obtain an invitation link.
5. Optional future anonymous continuity/claim flow needs a server-backed guest session and an explicit account-claim transaction. Use additive schema changes only if required; do not assign client strings to registered-user foreign keys or migrate existing data destructively.
6. Existing `useMeetHalf` event submission drops the selected meeting point when enabled. Finder handoff deliberately uses the ordinary fixed-place flow; fix that independent older behavior when revisiting the large creation form.

## Validation

See the PR for final command results. Added tests cover public/returning-user landing navigation, real API-client request contracts, guest recommendation handoff (including zero latitude), unknown-address failure, stale-result clearing, partial Google failure, and initialization of the actual guest creation page without a browser Maps key.

Live cloud smoke: backend geocoded Taipei Main Station and Banqiao Station and the public temporary midpoint returned HTTP 200, 5 nearby places and 2 travel estimates. HTTPS proxy compatibility is supplied by the previously prepared environment runtime preload, not application source changes.

Browser visual checks on physical mobile devices, live OAuth, browser Google Maps autocomplete, Pusher tracking/chat and notification delivery require the corresponding browser/service configuration and were not end-to-end tested. Existing functionality is retained, but unchanged code is not a regression guarantee. No production deployment or destructive migration is performed.

Final checks for this branch:
- Frontend production build: passed.
- Added tests: 7/7 passed across 2 files.
- Full frontend suite: 16 passed, 9 failed (25 total); the 9 failures are the existing Maps mock, EventCard and useAuth failures seen during onboarding.
- ESLint on all changed frontend files: passed with warnings in the existing creation/router code. Repository-wide lint: 2 existing errors (`no-var` in the Maps mock and `prefer-const` in Axios), 105 warnings.
- Frontend TypeScript check: blocked by 52 existing errors across older components/tests; no errors reported in Landing, FindMeeting, guest tests, router or CreateEvent. Production build does not perform this type check.
- `git diff --check`: passed.
- Live geocode + temporary midpoint API: passed (2 departures, 5 recommendations, 2 estimates).
- PR API access: environment proxy rejects api.github.com. Git HTTPS read/push works. An additive api.github.com allowance was saved to the environment draft; this does not alter production settings or apply the runtime policy.
