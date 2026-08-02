# StudyHub Architecture

This document tracks the service-layer refactor (Phase 1 of the platform
expansion) and the real status of each module. It exists so the next change
— by a person or by Claude — starts from an accurate picture instead of
re-discovering what's already there.

## Why a service layer

Before this refactor, every route called `supabase.from(...)` / `supabase.auth...`
directly inside its `useQuery`/`useMutation` callbacks. That's fine for a
small app, but it means the backend (Supabase) is wired into ~15 route files
instead of one place, so replacing it — with Firebase, or anything else —
would mean touching every route.

`src/services/*` extracts the **data access** (which table, which columns,
which storage bucket) out of the routes, while leaving **state/caching**
(react-query's `useQuery`/`useMutation`, loading/error states, toasts) in the
routes where it belongs. A route now looks like:

```ts
const notesQuery = useQuery({
  queryKey: ["notes", user?.id],
  queryFn: () => NotesService.list(),
});
```

instead of embedding the Supabase call inline. To swap backends later, only
`src/services/*.ts` changes — no route file does.

**Supabase, not localStorage, remains the backend for shared/multi-user
data** (Notes, Quizzes, Flashcards, Community, Groups, Leaderboard,
Notifications, Profile, Analytics). That's a deliberate deviation from an
earlier instruction to "use localStorage for everything" — localStorage is
per-device and can't back a leaderboard or a shared note feed. The one
module that *is* localStorage-backed by design is the on-device Study
Planner (`src/lib/planner/*` — Daily/Weekly/Monthly/Exams/Assignments/Streak),
built as a separate, earlier request. See "Two planners" below.

## Service layer status

| Service | File | Wired into routes? |
|---|---|---|
| `AuthService` | `services/auth.service.ts` | ✅ `lib/auth.tsx`, `routes/auth.tsx`, `routes/reset-password.tsx`, `routes/_app.settings.tsx` |
| `UserService` | `services/user.service.ts` | ✅ `hooks/use-profile.ts` (profile summary). `getBadges`/`getUserStats`/`uploadAvatar` written but not yet called from `_app.profile.tsx` — that route still queries Supabase directly. |
| `NotificationService` | `services/notification.service.ts` | ✅ `lib/notifications.ts` (list, markRead, push, realtime) |
| `StorageService` | `services/storage.service.ts` | ✅ Used by `NotesService` (attachments) and `UserService` (avatar, not yet called from a route) |
| `NotesService` | `services/notes.service.ts` | ✅ `routes/_app.notes.tsx` — list, create, like, bookmark, report, signed-URL download |
| `QuizService` | `services/quiz.service.ts` | ✅ `routes/_app.quizzes.tsx` — list, create, submit attempt |
| `FlashcardService` | `services/flashcard.service.ts` | ✅ `routes/_app.flashcards.tsx` — decks, cards, spaced-repetition grading |
| `PlannerService` (cloud) | `services/planner.service.ts` | ✅ `routes/_app.planner.tsx`'s "Cloud sessions"/"Goals" tabs and the AI revision plan's bulk task insert |
| `AnalyticsService` | `services/analytics.service.ts` | ✅ `routes/_app.analytics.tsx` |
| `AIService` | `services/ai.service.ts` | ✅ Re-exports the server functions; `_app.quizzes.tsx`, `_app.flashcards.tsx`, `_app.planner.tsx` import `generateQuiz`/`generateFlashcards`/`generateRevisionPlan` from here now (behavior-identical re-export). Model selection goes through `lib/ai/provider.server.ts`. |
| `AdminService` | `services/admin.service.ts` | ✅ `routes/_app.admin.tsx` — staff role check, moderation queue, resolve/remove |
| `UserService` (extended) | `services/user.service.ts` | ✅ `routes/_app.profile.tsx` — extended profile, badges, activity counts, auto-award |

**Every route that reads/writes Supabase now goes through a service.** Each migration above preserved
the original route's exact behavior, including two subtle cases worth
knowing about:
- `AnalyticsService.getStudyData` deliberately does **not** throw on a
  per-table read failure — the original route never checked those errors
  and rendered with whatever partial data came back. Making the service
  throw there would have changed the page from "shows partial data" to
  "shows nothing," which is a real UX regression, not a fix.
- `PlannerService`'s task-completion flow logs a `study_sessions` row via
  `AnalyticsService.logStudyMinutes`; that call is wrapped in try/catch at
  the call site (not inside the service) because the original insert was
  fire-and-forget — a logging failure there must not fail the "mark task
  complete" mutation the user is actually waiting on.

### Migrating a route to its service (recipe)

1. Open the route, find the `queryFn`/`mutationFn` bodies.
2. Replace the inline `supabase.from(...)` call with the matching
   `XService.method(...)` call — check `services/*.ts` for the exact
   signature first, they're typed.
3. Leave the `useQuery`/`useMutation` wrapper, `queryKey`, `onSuccess`,
   `onError`, and toasts exactly as they are.
4. Run `npx tsc --noEmit` and `npx eslint . --fix`.
5. If the route has multiple call sites (e.g. notes has create/like/bookmark/report),
   migrate them one at a time, type-checking after each.

## Two planners — don't merge them without a decision

- `src/lib/planner/*` + `src/components/planner/*` — **on-device**, localStorage,
  Daily/Weekly/Monthly/Exams/Assignments/Streak/Notifications-UI. Lives at
  `/planner`'s first five tabs.
- `services/planner.service.ts` — **cloud**, Supabase `study_tasks`/`study_goals`,
  multi-device. Lives at `/planner`'s "Cloud sessions"/"Goals" tabs.

They're intentionally separate today. Unifying them (e.g. migrating the
on-device tasks into `study_tasks` so they sync across devices) is a real
product decision — it changes the offline-first, no-signup-required nature
of the local planner — not something to do silently in a refactor.

## AI layer

`src/lib/ai/provider.server.ts` is the swap point for the AI model/provider.
Today only `lovable-gateway` (routed to Gemini via Lovable's AI Gateway) is
active — that's what the app already used. Adding OpenAI or Anthropic is
documented inline in that file (install the SDK, uncomment the provider,
set `AI_PROVIDER` in the environment); no call site changes.

`services/ai.service.ts` re-exports the three existing AI server functions
(`generateQuiz`, `generateFlashcards`, `generateRevisionPlan`) plus the chat
endpoint's model comes from the same provider file. Capabilities from the
spec that don't exist yet — **Note Summarizer, Homework Help, Exam
Preparation, Writing Assistant, Resource Recommendations** — are not
stubbed here; the file has a comment pointing at the pattern to follow
(`study-ai.functions.ts`) so the first one built sets the shape for the rest.

## Module status vs. the full spec

Modules that already exist and work (route + real Supabase data), all on the
service layer as of this pass:

Dashboard, Notes, Quizzes (+ AI generator), Flashcards (+ AI generator,
spaced repetition), Community, Study Groups, AI Tutor (chat), Profile
(Achievements/Badges + Leaderboard as tabs), Settings, Notifications
(real-time, not UI-only), Analytics, Admin/Moderation.

**Bug fixed this pass:** the "XP progress to next level" bar used two
different formulas in two places — `app-sidebar.tsx` used the correct
`level`-aware `levelProgress()`, while `_app.dashboard.tsx` and
`_app.profile.tsx` computed it as `xp % 500` directly. These agree only when
`level` is always exactly `floor(xp / 500) + 1`; any place XP and level
aren't updated in perfect lockstep (a bonus-XP grant, a manually adjusted
level, etc.) would make the two progress bars disagree. All three now call
the same `levelProgress()` from `services/user.service.ts`.

Built this session: **Study Planner** (Daily/Weekly/Monthly/Exams/Assignments,
local) — see the tabs at `/planner`.

Not implemented (spec items with no route/data model yet — flagged rather
than stubbed, per "do not leave placeholder code"):
- Past Papers (separate from Notes)
- Semester Planner, Pomodoro Timer, Break Reminders (planner sub-features)
- Rich text editor / folders / tags / version history / export PDF for Notes
  (Notes today: plain text + one file attachment, no folders/tags)
- Question bank / bookmarks / XP for Quizzes beyond what exists
- Deck management UI beyond the current list for Flashcards
- Note Summarizer, Homework Help, Exam Prep, Writing Assistant, Resource
  Recommendations (AI)
- Study heatmap / productivity score (Analytics has hours/subject/goal data;
  heatmap visualization not built)
- Premium/Subscription/M-Pesa/Stripe (explicitly "prepare architecture,
  don't implement" — not started this session)

## Cross-cutting

- **Error boundaries**: already handled at the router level —
  `routes/__root.tsx` has `errorComponent`/`notFoundComponent` wired to
  `reportLovableError`. No additional React error boundary was added; the
  existing one covers route render/load errors app-wide.
- **Route splitting**: TanStack Start's file-based router already code-splits
  per route (confirmed in the production build — each `_app.*` route emits
  its own chunk). No change needed.
- **Design tokens**: `src/lib/design-tokens.ts` centralizes priority/status
  color mappings (previously duplicated inline). `PriorityBadge` uses it;
  other ad hoc priority-color usages elsewhere haven't been swept yet.
- **Loading/empty states**: `components/dashboard/primitives.tsx` has
  `EmptyState`/`DashboardCard`/`SectionHeader`, reused by the new planner
  components. Not renamed/relocated out of `dashboard/` to avoid a
  cross-cutting rename touching many imports for no functional gain.
