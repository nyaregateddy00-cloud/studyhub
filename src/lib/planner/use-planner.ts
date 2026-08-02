import { nanoid } from "nanoid";
import { useCallback, useMemo, useSyncExternalStore } from "react";

import { getServerSnapshot, getSnapshot, setPlannerState, subscribe } from "@/lib/planner/storage";
import type {
  AssignmentItem,
  AssignmentStatus,
  ExamItem,
  NewAssignmentInput,
  NewExamInput,
  NewTaskInput,
  NotificationPrefs,
  PlannerTask,
} from "@/lib/planner/types";
import { computeStreak, sortByPriorityThenDate, todayISO, toISO } from "@/lib/planner/utils";

function nowISO() {
  return new Date().toISOString();
}

export function usePlanner() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addTask = useCallback((input: NewTaskInput) => {
    const task: PlannerTask = {
      id: nanoid(),
      title: input.title.trim(),
      subject: input.subject?.trim() || null,
      notes: input.notes?.trim() || null,
      date: input.date,
      time: input.time || null,
      durationMinutes: input.durationMinutes ?? 30,
      priority: input.priority ?? "medium",
      completed: false,
      completedAt: null,
      createdAt: nowISO(),
    };
    setPlannerState((prev) => ({ ...prev, tasks: [task, ...prev.tasks] }));
    return task;
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<PlannerTask>) => {
    setPlannerState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) => (task.id === id ? { ...task, ...patch } : task)),
    }));
  }, []);

  const toggleTaskComplete = useCallback((id: string) => {
    setPlannerState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) => {
        if (task.id !== id) return task;
        const completed = !task.completed;
        return { ...task, completed, completedAt: completed ? nowISO() : null };
      }),
    }));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setPlannerState((prev) => ({ ...prev, tasks: prev.tasks.filter((task) => task.id !== id) }));
  }, []);

  const addExam = useCallback((input: NewExamInput) => {
    const exam: ExamItem = {
      id: nanoid(),
      title: input.title.trim(),
      subject: input.subject?.trim() || null,
      date: input.date,
      time: input.time || null,
      location: input.location?.trim() || null,
      notes: input.notes?.trim() || null,
      createdAt: nowISO(),
    };
    setPlannerState((prev) => ({ ...prev, exams: [exam, ...prev.exams] }));
    return exam;
  }, []);

  const deleteExam = useCallback((id: string) => {
    setPlannerState((prev) => ({ ...prev, exams: prev.exams.filter((exam) => exam.id !== id) }));
  }, []);

  const addAssignment = useCallback((input: NewAssignmentInput) => {
    const assignment: AssignmentItem = {
      id: nanoid(),
      title: input.title.trim(),
      subject: input.subject?.trim() || null,
      dueDate: input.dueDate,
      priority: input.priority ?? "medium",
      status: "not_started",
      notes: input.notes?.trim() || null,
      completedAt: null,
      createdAt: nowISO(),
    };
    setPlannerState((prev) => ({ ...prev, assignments: [assignment, ...prev.assignments] }));
    return assignment;
  }, []);

  const updateAssignmentStatus = useCallback((id: string, status: AssignmentStatus) => {
    setPlannerState((prev) => ({
      ...prev,
      assignments: prev.assignments.map((assignment) =>
        assignment.id === id
          ? {
              ...assignment,
              status,
              completedAt: status === "submitted" ? nowISO() : null,
            }
          : assignment,
      ),
    }));
  }, []);

  const deleteAssignment = useCallback((id: string) => {
    setPlannerState((prev) => ({
      ...prev,
      assignments: prev.assignments.filter((assignment) => assignment.id !== id),
    }));
  }, []);

  const updateNotificationPrefs = useCallback((patch: Partial<NotificationPrefs>) => {
    setPlannerState((prev) => ({
      ...prev,
      notificationPrefs: { ...prev.notificationPrefs, ...patch },
    }));
  }, []);

  const derived = useMemo(() => {
    const today = todayISO();
    const activityDates = [
      ...state.tasks.filter((t) => t.completed && t.completedAt).map((t) => t.completedAt!),
      ...state.assignments
        .filter((a) => a.status === "submitted" && a.completedAt)
        .map((a) => a.completedAt!),
    ].map((iso) => toISO(new Date(iso)));

    const streak = computeStreak(activityDates);

    const todaysTasks = sortByPriorityThenDate(state.tasks.filter((t) => t.date === today));
    const upcomingTasks = sortByPriorityThenDate(
      state.tasks.filter((t) => !t.completed && t.date >= today),
    );
    const completedTasks = state.tasks.filter((t) => t.completed);
    const completionPercent = state.tasks.length
      ? Math.round((completedTasks.length / state.tasks.length) * 100)
      : 0;

    const weekMinutes = completedTasks
      .filter((t) => t.completedAt && toISO(new Date(t.completedAt)) >= toISO(sevenDaysAgo()))
      .reduce((sum, t) => sum + t.durationMinutes, 0);

    const upcomingExams = [...state.exams]
      .filter((e) => e.date >= today)
      .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1));

    const pendingAssignments = state.assignments.filter((a) => a.status !== "submitted");
    const overdueAssignments = pendingAssignments.filter((a) => a.dueDate < today);

    return {
      today,
      streak,
      todaysTasks,
      upcomingTasks,
      completedTasks,
      completionPercent,
      weekMinutes,
      upcomingExams,
      pendingAssignments,
      overdueAssignments,
    };
  }, [state]);

  return {
    tasks: state.tasks,
    exams: state.exams,
    assignments: state.assignments,
    notificationPrefs: state.notificationPrefs,
    ...derived,
    addTask,
    updateTask,
    toggleTaskComplete,
    deleteTask,
    addExam,
    deleteExam,
    addAssignment,
    updateAssignmentStatus,
    deleteAssignment,
    updateNotificationPrefs,
  };
}

function sevenDaysAgo(): Date {
  const date = new Date();
  date.setDate(date.getDate() - 6);
  return date;
}
