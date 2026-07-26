import { Link, Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  Bot,
  BarChart3,
  CalendarDays,
  LayoutDashboard,
  Layers,
  ListChecks,
  LogOut,
  Moon,
  MoreHorizontal,
  Settings as SettingsIcon,
  Shield,
  Sun,
  User,
  Users,
} from "lucide-react";
import { useEffect } from "react";

import { BrandLock } from "@/components/brand";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth, useSignOut } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app")({
  ssr: false,
  component: AppLayout,
});

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/notes", label: "Notes", icon: BookOpen },
  { to: "/assistant", label: "AI tutor", icon: Bot },
  { to: "/quizzes", label: "Quizzes", icon: ListChecks },
  { to: "/flashcards", label: "Flashcards", icon: Layers },
  { to: "/planner", label: "Planner", icon: CalendarDays },
  { to: "/community", label: "Community", icon: Users },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
  { to: "/admin", label: "Admin", icon: Shield },
] as const;


function AppLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const signOut = useSignOut();
  const { theme, toggle } = useTheme();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="min-h-screen space-y-4 p-8">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link to="/dashboard">
            <BrandLock />
          </Link>
          <nav className="hidden items-center gap-0.5 md:flex">
            {nav.slice(0, 6).map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "shrink-0 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                  pathname === item.to && "bg-primary/10 text-primary",
                )}
              >
                {item.label}
              </Link>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" aria-label="More sections">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {nav.slice(6).map((item) => (
                  <DropdownMenuItem key={item.to} asChild>
                    <Link to={item.to}>
                      <item.icon className="mr-2 size-4" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle dark mode">
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 pb-24 md:pb-8">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t border-border bg-surface md:hidden">
        {nav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex min-w-[20%] shrink-0 flex-col items-center gap-1 py-2.5 text-[11px] text-muted-foreground",
              pathname === item.to && "text-primary",
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}