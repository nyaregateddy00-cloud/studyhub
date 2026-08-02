import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  BookOpen,
  Bot,
  CalendarDays,
  Layers,
  LayoutDashboard,
  ListChecks,
  Search,
  Settings as SettingsIcon,
  User,
  Users,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const pages = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/notes", label: "Notes", icon: BookOpen },
  { to: "/assistant", label: "AI tutor", icon: Bot },
  { to: "/quizzes", label: "Quizzes", icon: ListChecks },
  { to: "/flashcards", label: "Flashcards", icon: Layers },
  { to: "/planner", label: "Planner", icon: CalendarDays },
  { to: "/community", label: "Community Q&A", icon: Users },
  { to: "/groups", label: "Study groups", icon: UsersRound },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

export function GlobalSearch({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useQuery({
    queryKey: ["global-search", term],
    enabled: open && term.trim().length > 1,
    staleTime: 30_000,
    queryFn: async () => {
      const like = `%${term.trim()}%`;
      const [notes, quizzes, decks, questions] = await Promise.all([
        supabase.from("notes").select("id,title").ilike("title", like).limit(5),
        supabase.from("quizzes").select("id,title").ilike("title", like).limit(5),
        supabase.from("flashcard_decks").select("id,title").ilike("title", like).limit(5),
        supabase.from("questions").select("id,title").ilike("title", like).limit(5),
      ]);
      return {
        notes: notes.data ?? [],
        quizzes: quizzes.data ?? [],
        decks: decks.data ?? [],
        questions: questions.data ?? [],
      };
    },
  });

  const go = (to: string) => {
    setOpen(false);
    setTerm("");
    void navigate({ to });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open global search"
        className={cn(
          "flex h-9 w-full items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-secondary",
          className,
        )}
      >
        <Search className="size-4 shrink-0" />
        <span className="min-w-0 truncate">Search StudyHub…</span>
        <kbd className="ml-auto hidden shrink-0 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium sm:inline">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          value={term}
          onValueChange={setTerm}
          placeholder="Search pages, notes, quizzes, decks, questions…"
        />
        <CommandList>
          <CommandEmpty>{results.isFetching ? "Searching…" : "No matches found."}</CommandEmpty>
          <CommandGroup heading="Pages">
            {pages.map((page) => (
              <CommandItem key={page.to} value={page.label} onSelect={() => go(page.to)}>
                <page.icon className="mr-2 size-4" />
                {page.label}
              </CommandItem>
            ))}
          </CommandGroup>
          {(results.data?.notes.length ?? 0) > 0 && (
            <CommandGroup heading="Notes">
              {results.data!.notes.map((note) => (
                <CommandItem
                  key={note.id}
                  value={`Note ${note.title}`}
                  onSelect={() => go("/notes")}
                >
                  <BookOpen className="mr-2 size-4" />
                  {note.title}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {(results.data?.quizzes.length ?? 0) > 0 && (
            <CommandGroup heading="Quizzes">
              {results.data!.quizzes.map((quiz) => (
                <CommandItem
                  key={quiz.id}
                  value={`Quiz ${quiz.title}`}
                  onSelect={() => go("/quizzes")}
                >
                  <ListChecks className="mr-2 size-4" />
                  {quiz.title}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {(results.data?.decks.length ?? 0) > 0 && (
            <CommandGroup heading="Flashcard decks">
              {results.data!.decks.map((deck) => (
                <CommandItem
                  key={deck.id}
                  value={`Deck ${deck.title}`}
                  onSelect={() => go("/flashcards")}
                >
                  <Layers className="mr-2 size-4" />
                  {deck.title}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {(results.data?.questions.length ?? 0) > 0 && (
            <CommandGroup heading="Community">
              {results.data!.questions.map((question) => (
                <CommandItem
                  key={question.id}
                  value={`Question ${question.title}`}
                  onSelect={() => go("/community")}
                >
                  <Users className="mr-2 size-4" />
                  {question.title}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
