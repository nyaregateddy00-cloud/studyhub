/**
 * Placeholder content for dashboard surfaces that do not yet have a backend
 * table. Swap each array for a real query when the data source lands.
 */

export const dailyQuotes = [
  { text: "Small daily progress beats one heroic all-nighter.", author: "StudyHub" },
  { text: "You don't have to be brilliant today, just consistent.", author: "StudyHub" },
  { text: "Recall beats re-reading. Test yourself.", author: "Learning Science" },
  { text: "Twenty focused minutes is a real study session.", author: "StudyHub" },
  { text: "Confusion is the feeling of learning happening.", author: "StudyHub" },
  { text: "Teach it out loud and you'll find the gaps instantly.", author: "Feynman" },
  { text: "Rest is part of the revision plan, not a break from it.", author: "StudyHub" },
];

export function quoteOfTheDay() {
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  return dailyQuotes[dayIndex % dailyQuotes.length];
}

export const announcements = [
  {
    id: "a1",
    title: "AI revision plans are live",
    body: "Generate a week-by-week plan from any note in the Planner.",
    tag: "New",
  },
  {
    id: "a2",
    title: "Community Q&A beta",
    body: "Ask a question and get answers from other students.",
    tag: "Beta",
  },
  {
    id: "a3",
    title: "Exports for analytics",
    body: "Download your full study history as PDF or JSON.",
    tag: "Update",
  },
];

export const trendingNotes = [
  { id: "t1", title: "Organic Chemistry — Reaction Maps", course: "Chemistry", likes: 248 },
  { id: "t2", title: "Data Structures Cheat Sheet", course: "Computer Science", likes: 191 },
  { id: "t3", title: "Macroeconomics Formula Pack", course: "Economics", likes: 164 },
  { id: "t4", title: "Human Anatomy — Nervous System", course: "Biology", likes: 132 },
];

export const recommendedMaterials = [
  { id: "r1", title: "Spaced repetition, explained", kind: "Guide", minutes: 6 },
  { id: "r2", title: "Past papers: Calculus II", kind: "Past paper", minutes: 45 },
  { id: "r3", title: "How to summarise a lecture in 10 minutes", kind: "Guide", minutes: 8 },
];