import { Link } from "@tanstack/react-router";
import { Bot, CalendarDays, Layers, ListChecks, Upload, Users, UsersRound } from "lucide-react";

const actions = [
  {
    to: "/notes",
    label: "Upload Notes",
    desc: "PDFs, DOCs, slides",
    icon: Upload,
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500/20",
  },
  {
    to: "/quizzes",
    label: "Generate Quiz",
    desc: "AI timed practice",
    icon: ListChecks,
    color: "bg-violet-500/10 text-violet-600 dark:text-violet-400 group-hover:bg-violet-500/20",
  },
  {
    to: "/assistant",
    label: "AI Tutor",
    desc: "Ask anything 24/7",
    icon: Bot,
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/20",
  },
  {
    to: "/planner",
    label: "Study Planner",
    desc: "Timetable & goals",
    icon: CalendarDays,
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20",
  },
  {
    to: "/flashcards",
    label: "Flashcards",
    desc: "Spaced repetition",
    icon: Layers,
    color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:bg-rose-500/20",
  },
  {
    to: "/community",
    label: "Community",
    desc: "Q&A with peers",
    icon: Users,
    color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 group-hover:bg-cyan-500/20",
  },
] as const;

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {actions.map((action) => (
        <Link
          key={action.to}
          to={action.to}
          className="group relative flex items-start gap-3 rounded-2xl border border-border/80 bg-gradient-to-b from-card to-card/60 p-4 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md active:translate-y-0 active:scale-[0.98]"
        >
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-xl transition-transform duration-200 group-hover:scale-110 shadow-2xs ${action.color}`}
          >
            <action.icon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
              {action.label}
            </span>
            <span className="block truncate text-[11px] text-muted-foreground mt-0.5">
              {action.desc}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
