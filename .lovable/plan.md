
# StudyHub Audit & Improvement Plan

No rewrites. Every route, table and component stays; changes are additive or in-place hardening.

## Audit — issues found

**Correctness / bugs**
1. `_app.tsx` uses a `useEffect` + `navigate` auth guard on a route with `ssr: false`. It works, but flashes a skeleton and re-runs on every render cycle; the platform's `_authenticated` gate pattern is more reliable.
2. `AuthProvider` sets `loading=false` from both `onAuthStateChange` and `getSession()` — a race that can briefly render signed-out UI for a signed-in user.
3. Notifications poll every 30s for all users regardless of tab visibility (battery/quota cost); no realtime.
4. Group chat polls every 15s instead of using realtime, so messages lag and every member burns requests.
5. Note like toggle relies on catching a `23505` unique-violation as control flow — noisy and racy.
6. `_app.notes.tsx` uses `window.prompt` for reporting (blocked in some embeds, unstyled, not accessible).

**Performance**
7. 18 `select("*")` calls across routes — over-fetching wide rows (notes `content`, quizzes `questions` JSONB) into list views.
8. No React Query defaults (`staleTime`/`gcTime`), so every route revisit refetches immediately.
9. Heavy libs (`recharts`, `jspdf`, `jspdf-autotable`) are statically imported into analytics/dashboard, inflating the main bundle. They should be lazy/dynamic.
10. Dashboard fires ~10 separate queries; several can be narrowed and cached.
11. Large route files (dashboard 567, groups 579, planner 520 lines) re-render wholesale on any state change.

**Security**
12. `pushNotification` inserts client-side into `notifications` — RLS scopes to `auth.uid()`, so cross-user notifications silently fail; should move server-side.
13. Note like activity is readable by any signed-in user (open warning from the last scan).
14. Reports/moderation actions are client-trust only; admin checks should be re-verified server-side.

**UI/UX, a11y, responsiveness**
15. Inconsistent empty/loading states — some routes use skeletons, others plain text.
16. Icon-only buttons in notes/groups lack consistent `aria-label`/focus-visible treatment; charts have no accessible summary.
17. No global sidebar: the app is a top-nav + "More" dropdown, which is cramped on tablet. A collapsible sidebar (desktop) + sheet (mobile) fits the existing shell.
18. Mixed spacing/typography scales between older (notes, quizzes) and newer (dashboard) pages.

**TypeScript / code quality**
19. `@typescript-eslint/no-unused-vars` disabled; several `user!.id` non-null assertions inside queries.
20. Duplicated patterns: auth-gated `useQuery` boilerplate, date bucketing, chart tooltips, dialog forms — should become shared hooks/components.

**AI**
21. `/api/chat` is text-only: no attachments, no tools, no conversation persistence.
22. Quiz/flashcard generation only accepts pasted text — cannot consume an uploaded note.

## Prioritized phases

**Phase 1 — Foundations (bugs, security, perf) — highest value**
- Fix the auth race and guard; add visibility-aware polling.
- Replace group-chat and notification polling with Supabase realtime.
- Replace all list-view `select("*")` with explicit column projections.
- Add React Query defaults (staleTime 60s, retry policy) in `router.tsx`.
- Lazy-load `recharts` and `jspdf` behind dynamic imports.
- Move `pushNotification` to a server function with proper authorization; lock down note-like reads.
- Replace `window.prompt` report flow with a dialog.

**Phase 2 — Shared primitives & UI consistency**
- Extract `useAuthedQuery`, shared `PageHeader`, `EmptyState`, `LoadingState`, `StatCard`, chart tooltip.
- Introduce the collapsible sidebar shell (desktop) + mobile sheet, preserving all existing nav destinations.
- Accessibility pass: labels, focus rings, keyboard flows, reduced-motion, chart alt summaries.

**Phase 3 — AI extension (reusing `/api/chat` + existing gateway)**
- Attachment pipeline: PDF / DOCX / PPTX / image OCR / handwriting / audio transcription, sent as multimodal parts to the existing gateway; YouTube summarization by transcript fetch.
- Tools on the existing chat route: generate flashcards, generate quiz, build a revision plan — writing to the existing tables.
- Conversation persistence + context awareness (thread scoped to the signed-in user).

**Phase 4 — Module upgrades**
- Notes: "Study with AI", AI summary/flashcards/quiz from a note, tags, filtering, markdown rendering, document preview.
- Quizzes: difficulty levels, timer, adaptive selection, review mode, performance analytics, leaderboard.
- Flashcards: SM-2 spaced repetition scheduling, progress stats.
- Planner: calendar view, exam countdowns, weekly goals, reminder notifications.
- Community/Groups: resource sharing, threaded discussion, realtime, moderation tools.
- Dashboard: today's goals, deadlines, AI recommendations, sharper stats and empty states.

## Technical notes
- Phase 3/4 AI work needs schema additions (`note_tags`/`tags` column, `chat_threads`/`chat_messages`, quiz `difficulty` usage, flashcard SM-2 fields). Those go through migrations you approve, table-by-table.
- Attachment parsing runs in `createServerFn` handlers; the Cloudflare Worker runtime rules out native parsers, so PDFs/images/audio go to the multimodal gateway directly rather than a Node parsing library.
- No dependency removals; additions limited to what each phase needs.

I'll start with Phase 1 and report back before moving on.
