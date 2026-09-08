import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  BookOpen,
  Bot,
  CalendarDays,
  Crown,
  Flame,
  LayoutDashboard,
  Layers,
  ListChecks,
  LogOut,
  Settings as SettingsIcon,
  Shield,
  Sparkles,
  Trophy,
  User,
  Users,
  UsersRound,
} from "lucide-react";

import { BrandMark } from "@/components/brand";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { initialsOf, levelProgress, useProfileSummary } from "@/hooks/use-profile";
import { useSubscription } from "@/hooks/use-subscription";
import { useSignOut } from "@/lib/auth";
import { useNotifications } from "@/lib/notifications";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof BookOpen };

const sections: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Learning",
    items: [
      { to: "/notes", label: "Notes", icon: BookOpen },
      { to: "/quizzes", label: "Quizzes", icon: ListChecks },
      { to: "/flashcards", label: "Flashcards", icon: Layers },
      { to: "/planner", label: "Planner", icon: CalendarDays },
      { to: "/analytics", label: "Progress", icon: BarChart3 },
    ],
  },
  {
    label: "AI tools",
    items: [{ to: "/assistant", label: "AI tutor", icon: Bot }],
  },
  {
    label: "Community",
    items: [
      { to: "/community", label: "Q&A", icon: Users },
      { to: "/groups", label: "Study groups", icon: UsersRound },
      { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
    ],
  },
  {
    label: "Account",
    items: [
      { to: "/profile", label: "Profile", icon: User },
      { to: "/premium", label: "Premium", icon: Crown },
      { to: "/settings", label: "Settings", icon: SettingsIcon },
      { to: "/admin", label: "Admin", icon: Shield },
    ],
  },
];

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const pathname = useRouterState({ select: (router) => router.location.pathname });
  const { data: profile } = useProfileSummary();
  const { data: notifications } = useNotifications();
  const { status: subscriptionStatus } = useSubscription();
  const signOut = useSignOut();

  const unread = (notifications ?? []).filter((item) => !item.is_read).length;
  const progress = levelProgress(profile?.xp ?? 0, profile?.level ?? 1);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="gap-3">
        <Link
          to="/dashboard"
          onClick={() => setOpenMobile(false)}
          className="flex items-center gap-2 px-1 py-1"
        >
          <BrandMark className="size-7 shrink-0" />
          {!collapsed && (
            <span className="font-display text-base font-bold tracking-tight">StudyHub</span>
          )}
        </Link>

        {!collapsed && (
          <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/60 p-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Avatar className="size-9 shrink-0">
                <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
                <AvatarFallback>{initialsOf(profile?.display_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {profile?.display_name ?? "Student"}
                </p>
                <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>Level {profile?.level ?? 1}</span>
                  <span className="inline-flex items-center gap-0.5">
                    <Flame className="size-3 text-warning" />
                    {profile?.streak_days ?? 0}d
                  </span>
                </p>
              </div>
            </div>
            <Progress value={progress.percent} className="mt-2.5 h-1.5" />
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {progress.into}/{progress.span} XP to level {(profile?.level ?? 1) + 1}
            </p>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {sections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={`${section.label}-${item.to}-${item.label}`}>
                    <SidebarMenuButton asChild isActive={pathname === item.to} tooltip={item.label}>
                      <Link to={item.to} onClick={() => setOpenMobile(false)}>
                        <item.icon className="size-4 shrink-0" />
                        <span className="min-w-0 truncate">{item.label}</span>
                        {item.to === "/dashboard" && unread > 0 && (
                          <span className="ml-auto rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                            {unread > 9 ? "9+" : unread}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {!collapsed && !subscriptionStatus.isPremium && (
          <div className="mx-2 mb-2 rounded-2xl border border-primary/25 bg-primary/5 p-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Crown className="size-4 text-warning" /> StudyHub Pro
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Unlimited AI tutoring, downloads and quizzes for KSh 49 / 7 days.
            </p>
            <Link
              to="/premium"
              onClick={() => setOpenMobile(false)}
              className="mt-2.5 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Sparkles className="size-3.5" /> Upgrade
            </Link>
          </div>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} tooltip="Log out">
              <LogOut className={cn("size-4 shrink-0")} />
              <span>Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
