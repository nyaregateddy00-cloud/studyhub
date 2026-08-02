import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday as isTodayFns,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";

import type { Priority } from "@/lib/planner/types";

export const PRIORITY_WEIGHT: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
export const PRIORITY_LABEL: Record<Priority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function toDate(iso: string): Date {
  return parseISO(iso);
}

export function toISO(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function isToday(iso: string): boolean {
  return isTodayFns(toDate(iso));
}

export function friendlyDate(iso: string): string {
  const date = toDate(iso);
  if (isTodayFns(date)) return "Today";
  const tomorrow = addDays(startOfDay(new Date()), 1);
  if (isSameDay(date, tomorrow)) return "Tomorrow";
  return format(date, "EEE, MMM d");
}

/** Days until (positive) or since (negative) the given ISO date, relative to today. */
export function daysUntil(iso: string): number {
  const today = startOfDay(new Date());
  const target = startOfDay(toDate(iso));
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function countdownLabel(iso: string): string {
  const days = daysUntil(iso);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function shiftWeek(anchor: Date, delta: number): Date {
  return addDays(anchor, delta * 7);
}

export type MonthCell = { date: Date; inCurrentMonth: boolean };

export function monthGrid(anchor: Date): MonthCell[] {
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: gridStart, end: gridEnd }).map((date) => ({
    date,
    inCurrentMonth: isSameMonth(date, anchor),
  }));
}

export function shiftMonth(anchor: Date, delta: number): Date {
  return delta >= 0 ? addMonths(anchor, delta) : subMonths(anchor, Math.abs(delta));
}

/**
 * Consecutive-day streak ending today (or yesterday, so a day in progress
 * doesn't zero out the streak before the user has had a chance to study).
 */
export function computeStreak(activityDatesISO: string[]): number {
  const unique = new Set(activityDatesISO);
  if (unique.size === 0) return 0;

  let cursor = startOfDay(new Date());
  const hasToday = unique.has(toISO(cursor));
  if (!hasToday) {
    cursor = addDays(cursor, -1);
    if (!unique.has(toISO(cursor))) return 0;
  }

  let streak = 0;
  while (unique.has(toISO(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function sortByPriorityThenDate<T extends { priority: Priority; date: string }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
  });
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}
