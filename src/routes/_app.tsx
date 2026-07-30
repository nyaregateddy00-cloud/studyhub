import { Link, Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  Bot,
  CalendarDays,
  LayoutDashboard,
  Layers,
  Moon,
  Sun,
  User,
} from "lucide-react";
import { useEffect } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { GlobalSearch } from "@/components/global-search";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app")({
  ssr: false,
  component: AppLayout,
});

// Compact tab bar shown only on phones; the sidebar drawer holds the rest.
const mobileNav = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/notes", label: "Notes", icon: BookOpen },
  { to: "/assistant", label: "Tutor", icon: Bot },
  { to: "/flashcards", label: "Cards", icon: Layers },
  { to: "/planner", label: "Plan", icon: CalendarDays },
  { to: "/profile", label: "You", icon: User },
] as const;

function AppLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
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
    <SidebarProvider>
      <div className="flex min-h-dvh w-full bg-background">
        <AppSidebar />
        <SidebarInset className="min-w-0 bg-transparent">
          <header className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur-xl">
            <div className="flex h-16 items-center gap-2 px-3 sm:px-5">
              <SidebarTrigger className="shrink-0" />
              <div className="min-w-0 flex-1 sm:max-w-sm">
                <GlobalSearch />
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-1">
                <NotificationBell />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggle}
                  aria-label="Toggle dark mode"
                >
                  {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                </Button>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-7xl px-4 py-6 pb-28 sm:px-6 sm:py-8 md:pb-10">
            <Outlet />
          </main>
        </SidebarInset>
      </div>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface/95 backdrop-blur md:hidden"
      >
        {mobileNav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground transition-colors",
              pathname === item.to && "text-primary",
            )}
          >
            <item.icon className="size-[18px]" />
            {item.label}
          </Link>
        ))}
      </nav>
    </SidebarProvider>
  );
}