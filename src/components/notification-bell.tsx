import { Link } from "@tanstack/react-router";
import {
  Bell,
  BellOff,
  CalendarClock,
  CheckCheck,
  Info,
  MessageSquare,
  Trophy,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMarkNotificationsRead, useNotifications } from "@/lib/notifications";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Info> = {
  community: MessageSquare,
  reminder: CalendarClock,
  achievement: Trophy,
  info: Info,
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell() {
  const { data } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const [tab, setTab] = useState<"all" | "unread">("all");
  const items = data ?? [];
  const unread = items.filter((item) => !item.is_read).length;
  const visible = tab === "unread" ? items.filter((item) => !item.is_read) : items;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute right-0.5 top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-[11px] text-muted-foreground">
              {unread > 0 ? `${unread} unread` : "All caught up"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={unread === 0 || markRead.isPending}
            onClick={() => markRead.mutate(undefined)}
          >
            <CheckCheck className="mr-1 size-3.5" /> Mark all
          </Button>
        </div>
        <div className="border-b border-border px-3 py-2">
          <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1">
                All
              </TabsTrigger>
              <TabsTrigger value="unread" className="flex-1">
                Unread {unread > 0 ? `(${unread})` : ""}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <ScrollArea className="max-h-80">
          {visible.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <BellOff className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                {tab === "unread" ? "Nothing unread." : "No notifications yet."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {visible.map((item) => {
                const Icon = ICONS[item.type] ?? Info;
                return (
                  <li
                    key={item.id}
                    className={cn(
                      "flex gap-3 px-4 py-3 transition-colors hover:bg-secondary/60",
                      !item.is_read && "bg-primary/5",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                        item.is_read
                          ? "bg-secondary text-muted-foreground"
                          : "bg-primary/10 text-primary",
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{item.title}</p>
                      {item.body && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {item.body}
                        </p>
                      )}
                      <div className="mt-1 flex items-center gap-3">
                        <span className="text-[11px] text-muted-foreground">
                          {timeAgo(item.created_at)}
                        </span>
                        {item.link && (
                          <Link
                            to={item.link}
                            onClick={() => !item.is_read && markRead.mutate([item.id])}
                            className="text-[11px] font-medium text-primary hover:underline"
                          >
                            Open
                          </Link>
                        )}
                        {!item.is_read && (
                          <button
                            type="button"
                            onClick={() => markRead.mutate([item.id])}
                            className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
