import { supabase } from "@/integrations/supabase/client";
import type { Insert, Row, Update } from "@/services/types";

/**
 * This wraps the cloud-synced "Schedule"/"Goals" tabs (Supabase `study_tasks`
 * and `study_goals`, multi-device by design). It is deliberately separate
 * from `src/lib/planner/*`, which is the on-device Daily/Weekly/Monthly
 * planner backed by localStorage. Merging the two into one data model is a
 * bigger product decision (see ARCHITECTURE.md) — this service only touches
 * the cloud side that already existed.
 */

export type StudyTaskRow = Row<"study_tasks">;
export type StudyGoalRow = Row<"study_goals">;
export type NewStudyTaskInput = Omit<Insert<"study_tasks">, "id" | "created_at" | "updated_at">;
export type NewStudyGoalInput = Omit<Insert<"study_goals">, "id" | "created_at" | "updated_at">;

const TASK_COLUMNS =
  "id,title,subject,due_date,duration_minutes,priority,completed,completed_at,notes,created_at";
const GOAL_COLUMNS =
  "id,title,subject,target_date,target_minutes,progress_minutes,created_at,updated_at";

export const PlannerService = {
  async listTasks() {
    const { data, error } = await supabase
      .from("study_tasks")
      .select(TASK_COLUMNS)
      .order("due_date", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  async createTask(input: NewStudyTaskInput) {
    const { data, error } = await supabase.from("study_tasks").insert(input).select().single();
    if (error) throw error;
    return data;
  },

  /** Bulk insert used by the AI revision plan, which creates many tasks at once. */
  async createTasks(inputs: NewStudyTaskInput[]): Promise<void> {
    if (inputs.length === 0) return;
    const { error } = await supabase.from("study_tasks").insert(inputs);
    if (error) throw error;
  },

  async updateTask(id: string, patch: Update<"study_tasks">): Promise<void> {
    const { error } = await supabase.from("study_tasks").update(patch).eq("id", id);
    if (error) throw error;
  },

  async deleteTask(id: string): Promise<void> {
    const { error } = await supabase.from("study_tasks").delete().eq("id", id);
    if (error) throw error;
  },

  async listGoals() {
    const { data, error } = await supabase
      .from("study_goals")
      .select(GOAL_COLUMNS)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  async createGoal(input: NewStudyGoalInput) {
    const { data, error } = await supabase.from("study_goals").insert(input).select().single();
    if (error) throw error;
    return data;
  },

  async updateGoalProgress(id: string, progressMinutes: number): Promise<void> {
    const { error } = await supabase
      .from("study_goals")
      .update({ progress_minutes: progressMinutes })
      .eq("id", id);
    if (error) throw error;
  },

  async deleteGoal(id: string): Promise<void> {
    const { error } = await supabase.from("study_goals").delete().eq("id", id);
    if (error) throw error;
  },
};
