/**
 * Centralized color tokens for recurring status/priority semantics, so
 * "high priority = destructive red" etc. is defined once instead of being
 * re-typed as Tailwind class strings in every component that shows a badge.
 * These reference the same CSS variables (destructive/warning/accent/...)
 * already defined in styles.css, so dark mode support is automatic.
 */

export type Priority = "low" | "medium" | "high";

export const PRIORITY_CLASSES: Record<Priority, string> = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-warning/10 text-warning",
  low: "bg-success/10 text-success",
};

export type Status = "success" | "warning" | "danger" | "info" | "neutral";

export const STATUS_CLASSES: Record<Status, string> = {
  success: "bg-primary/10 text-primary",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
  info: "bg-success/10 text-success",
  neutral: "bg-secondary text-muted-foreground",
};

export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTY_CLASSES: Record<Difficulty, { bg: string; text: string; border: string; pill: string }> = {
  easy: {
    bg: "bg-success/10",
    text: "text-success",
    border: "border-success/30",
    pill: "bg-success/10 text-success border-success/20",
  },
  medium: {
    bg: "bg-warning/10",
    text: "text-warning",
    border: "border-warning/30",
    pill: "bg-warning/10 text-warning border-warning/20",
  },
  hard: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/30",
    pill: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

export const RESOURCE_TYPE_CLASSES: Record<string, string> = {
  lecture_notes: "bg-primary/10 text-primary border-primary/20",
  past_paper: "bg-warning/10 text-warning border-warning/20",
  summary: "bg-success/10 text-success border-success/20",
  cheatsheet: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  assignment: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  textbook: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
};

