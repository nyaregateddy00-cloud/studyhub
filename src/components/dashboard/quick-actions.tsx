import { Link } from "@tanstack/react-router";
import { Bot, CalendarDays, Layers, ListChecks, Upload, Users, UsersRound } from "lucide-react";

const actions = [
  { to: "/notes", label: "Upload Notes", icon: Upload },
  { to: "/quizzes", label: "Generate Quiz", icon: ListChecks },
  { to: "/assistant", label: "AI Assistant", icon: Bot },
  { to: "/planner", label: "Study Planner", icon: CalendarDays },
  { to: "/flashcards", label: "Flashcards", icon: Layers },
  { to: "/community", label: "Community", icon: Users },
  { to: "/groups", label: "Study Groups", icon: UsersRound },
] as const;

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {actions.map((action) => (
        <Link
          key={action.to}
          to={action.to}
          className="lift group flex items-center gap-3 rounded-xl border border-border bg-secondary/40 px-3 py-3 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-primary/5"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-105">
            <action.icon className="size-4" />
          </span>
          <span className="min-w-0 truncate">{action.label}</span>
        </Link>
      ))}
    </div>
  );
}