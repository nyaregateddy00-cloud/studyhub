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
  low: "bg-accent/10 text-accent",
};

export type Status = "success" | "warning" | "danger" | "info" | "neutral";

export const STATUS_CLASSES: Record<Status, string> = {
  success: "bg-primary/10 text-primary",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
  info: "bg-accent/10 text-accent",
  neutral: "bg-secondary text-muted-foreground",
};
