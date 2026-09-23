import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  BookOpen,
  Bot,
  CalendarDays,
  Flame,
  LayoutDashboard,
  Layers,
  ListChecks,
  LogOut,
  Settings as SettingsIcon,
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
      { to: "/settings", label: "Settings", icon: SettingsIcon },
    ],
  },
];

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const pathname = useRouterState({ select: (router) => router.location.pathname });
  const { data: profile } = useProfileSummary();
  const { data: notifications } = useNotifications();
  const signOut = useSignOut();

  const unread = (notifications ?? []).filter((item) => !item.is_read).length;
  const progress = levelProgress(profile?.xp ?? 0, profile?.level ?? 1);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="gap-3 p-3">
        <Link
          to="/dashboard"
          onClick={() => setOpenMobile(false)}
          className="group flex items-center gap-2.5 px-1 py-1 rounded-xl transition-all"
        >
          <div className="relative">
            <BrandMark className="size-8 shrink-0 transition-transform duration-200 group-hover:scale-105" />
            <div className="absolute -inset-1 rounded-full bg-primary/20 blur-xs -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="font-display text-base font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
                StudyHub
              </span>
              <span className="block text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                AI Workspace
              </span>
            </div>
          )}
        </Link>

        {!collapsed && (
          <div className="rounded-2xl border border-border/80 bg-gradient-to-b from-card to-card/50 p-3 shadow-xs transition-all hover:border-primary/30">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative">
                <Avatar className="size-10 shrink-0 ring-2 ring-primary/30 shadow-xs">
                  <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-indigo-500/20 text-primary text-xs font-bold">
                    {initialsOf(profile?.display_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground ring-2 ring-background">
                  {profile?.level ?? 1}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                  {profile?.display_name ?? "Student"}
                </p>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px]">
                  <span className="inline-flex items-center gap-1 rounded-md bg-warning/10 px-1.5 py-0.2 border border-warning/20 font-semibold text-warning text-[10px]">
                    <Flame className="size-3 fill-warning" />
                    {profile?.streak_days ?? 0}d streak
                  </span>
                  <span className="text-muted-foreground text-[10px]">
                    Lvl {profile?.level ?? 1}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1 font-medium">
                <span>XP Progress</span>
                <span className="text-foreground/80 font-semibold">{progress.percent}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-indigo-500 transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <p className="mt-1 text-right text-[10px] text-muted-foreground">
                {progress.into}/{progress.span} XP to Lvl {(profile?.level ?? 1) + 1}
              </p>
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="custom-scrollbar px-1">
        {sections.map((section) => (
          <SidebarGroup key={section.label} className="py-1">
            <SidebarGroupLabel className="text-[10px] font-bold tracking-widest text-muted-foreground/60 uppercase px-3">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const isActive = pathname === item.to;
                  return (
                    <SidebarMenuItem key={`${section.label}-${item.to}-${item.label}`}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                        className={cn(
                          "transition-all duration-150 rounded-xl px-3 py-2 my-0.5 text-sm font-medium",
                          isActive
                            ? "bg-gradient-to-r from-primary/15 via-primary/10 to-transparent text-primary font-semibold border-l-2 border-primary shadow-2xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/60 hover:translate-x-0.5",
                        )}
                      >
                        <Link to={item.to} onClick={() => setOpenMobile(false)}>
                          <item.icon
                            className={cn(
                              "size-4 shrink-0 transition-transform duration-150",
                              isActive ? "text-primary scale-110" : "text-muted-foreground group-hover:text-foreground",
                            )}
                          />
                          <span className="min-w-0 truncate">{item.label}</span>
                          {item.to === "/dashboard" && unread > 0 && (
                            <span className="ml-auto rounded-full bg-gradient-to-r from-primary to-indigo-500 px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground shadow-xs">
                              {unread > 9 ? "9+" : unread}
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
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
