import type { PlannerState } from "@/lib/planner/types";

const STORAGE_KEY = "studyhub.planner.v1";

export const DEFAULT_STATE: PlannerState = {
  version: 1,
  tasks: [],
  exams: [],
  assignments: [],
  notificationPrefs: {
    examReminders: true,
    taskReminders: true,
    dailyDigest: false,
    streakAlerts: true,
  },
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function loadFromDisk(): PlannerState {
  if (!isBrowser()) return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<PlannerState>;
    return {
      version: 1,
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      exams: Array.isArray(parsed.exams) ? parsed.exams : [],
      assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
      notificationPrefs: {
        ...DEFAULT_STATE.notificationPrefs,
        ...(parsed.notificationPrefs ?? {}),
      },
    };
  } catch {
    // Corrupt or inaccessible storage (e.g. private browsing quota) — fall back cleanly.
    return DEFAULT_STATE;
  }
}

let state: PlannerState = loadFromDisk();
const listeners = new Set<() => void>();

function persist() {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable — the in-memory state still works for this session.
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): PlannerState {
  return state;
}

export function getServerSnapshot(): PlannerState {
  return DEFAULT_STATE;
}

export function setPlannerState(updater: (prev: PlannerState) => PlannerState): void {
  state = updater(state);
  persist();
  emit();
}

if (isBrowser()) {
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    state = loadFromDisk();
    emit();
  });
}
