export type Priority = "low" | "medium" | "high";

export type PlannerTask = {
  id: string;
  title: string;
  subject: string | null;
  notes: string | null;
  /** ISO date, yyyy-MM-dd */
  date: string;
  /** Optional HH:mm time for timetable slots */
  time: string | null;
  durationMinutes: number;
  priority: Priority;
  completed: boolean;
  /** ISO datetime the task was marked complete */
  completedAt: string | null;
  createdAt: string;
};

export type ExamItem = {
  id: string;
  title: string;
  subject: string | null;
  /** ISO date, yyyy-MM-dd */
  date: string;
  time: string | null;
  location: string | null;
  notes: string | null;
  createdAt: string;
};

export type AssignmentStatus = "not_started" | "in_progress" | "submitted";

export type AssignmentItem = {
  id: string;
  title: string;
  subject: string | null;
  dueDate: string;
  priority: Priority;
  status: AssignmentStatus;
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type NotificationPrefs = {
  examReminders: boolean;
  taskReminders: boolean;
  dailyDigest: boolean;
  streakAlerts: boolean;
};

export type PlannerState = {
  version: 1;
  tasks: PlannerTask[];
  exams: ExamItem[];
  assignments: AssignmentItem[];
  notificationPrefs: NotificationPrefs;
};

export type NewTaskInput = {
  title: string;
  subject?: string | null;
  notes?: string | null;
  date: string;
  time?: string | null;
  durationMinutes?: number;
  priority?: Priority;
};

export type NewExamInput = {
  title: string;
  subject?: string | null;
  date: string;
  time?: string | null;
  location?: string | null;
  notes?: string | null;
};

export type NewAssignmentInput = {
  title: string;
  subject?: string | null;
  dueDate: string;
  priority?: Priority;
  notes?: string | null;
};
