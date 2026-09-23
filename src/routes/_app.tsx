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
import { useSubscription } from "@/hooks/use-subscription";
import { useStreakHeartbeat } from "@/hooks/use-streak";
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
  const { data: subscription, isSuccess: subscriptionLoaded } = useSubscription();

  // Keeps the daily streak (and its XP reward) live for whoever is signed in.
  useStreakHeartbeat();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [loading, session, navigate]);

  // First-time users land on the welcome/reviews screen before the dashboard.
  useEffect(() => {
    if (!subscriptionLoaded || !subscription) return;
    if (subscription.onboarded_at) return;
    if (pathname === "/welcome") return;
    navigate({ to: "/welcome", replace: true });
  }, [subscriptionLoaded, subscription, pathname, navigate]);

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
        <SidebarInset className="min-w-0 bg-transparent flex flex-col">
          <div className="h-[2px] w-full bg-gradient-to-r from-primary via-indigo-500 to-emerald-400 shrink-0" />
          <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl shadow-2xs transition-colors">
            <div className="flex h-16 items-center gap-2 px-3 sm:px-5">
              <SidebarTrigger className="shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 sm:max-w-sm">
                <GlobalSearch />
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <NotificationBell />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggle}
                  aria-label="Toggle dark mode"
                  className="size-9 rounded-xl border border-border/50 hover:bg-secondary/80 transition-all active:scale-95 shadow-2xs"
                >
                  {theme === "dark" ? (
                    <Sun className="size-4 text-warning transition-transform rotate-0 scale-100" />
                  ) : (
                    <Moon className="size-4 text-muted-foreground transition-transform rotate-0 scale-100" />
                  )}
                </Button>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-28 sm:px-6 sm:py-8 md:pb-10">
            <Outlet />
          </main>
        </SidebarInset>
      </div>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border/70 bg-background/90 backdrop-blur-xl shadow-lg md:hidden"
      >
        {mobileNav.map((item) => {
          const isActive = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "group relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-all",
                isActive ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {isActive && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-gradient-to-r from-primary to-indigo-500 shadow-sm shadow-primary/50" />
              )}
              <item.icon
                className={cn(
                  "size-[18px] transition-transform duration-200 group-hover:scale-110",
                  isActive && "scale-110 text-primary",
                )}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </SidebarProvider>
  );
}
