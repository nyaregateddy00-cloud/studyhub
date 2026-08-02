import { supabase } from "@/integrations/supabase/client";
import type { Row } from "@/services/types";

export type NoteReportRow = Pick<
  Row<"note_reports">,
  "id" | "note_id" | "user_id" | "reason" | "status" | "created_at"
>;
export type ModeratedQuestionRow = Pick<Row<"questions">, "id" | "title" | "created_at">;

export const AdminService = {
  async getStaffRole(userId: string): Promise<{ isAdmin: boolean; isModerator: boolean }> {
    const [admin, moderator] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "moderator" }),
    ]);
    return { isAdmin: Boolean(admin.data), isModerator: Boolean(moderator.data) };
  },

  async getModerationQueue() {
    const [reports, questions] = await Promise.all([
      supabase
        .from("note_reports")
        .select("id,note_id,user_id,reason,status,created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("questions")
        .select("id,title,created_at")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    return {
      reports: (reports.data ?? []) as NoteReportRow[],
      questions: (questions.data ?? []) as ModeratedQuestionRow[],
    };
  },

  async resolveReport(id: string): Promise<void> {
    const { error } = await supabase
      .from("note_reports")
      .update({ status: "resolved" })
      .eq("id", id);
    if (error) throw error;
  },

  async removeNote(noteId: string): Promise<void> {
    const { error } = await supabase.from("notes").delete().eq("id", noteId);
    if (error) throw error;
  },

  async removeQuestion(id: string): Promise<void> {
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) throw error;
  },
};
