import { supabase } from "@/integrations/supabase/client";
import type { Row } from "@/services/types";

export type NoteReportRow = Pick<
  Row<"note_reports">,
  "id" | "note_id" | "user_id" | "reason" | "status" | "created_at"
>;
export type ModeratedQuestionRow = Pick<Row<"questions">, "id" | "title" | "created_at">;

export type AuditLogRow = Pick<
  Row<"admin_audit_log">,
  "id" | "actor_id" | "action" | "entity_type" | "entity_id" | "detail" | "created_at"
>;

const AUDIT_COLUMNS = "id,actor_id,action,entity_type,entity_id,detail,created_at";

export const AdminService = {
  async getStaffRole(userId: string): Promise<{ isAdmin: boolean; isModerator: boolean }> {
    const [admin, moderator] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "moderator" }),
    ]);
    return { isAdmin: Boolean(admin.data), isModerator: Boolean(moderator.data) };
  },

  /**
   * Every staff action is written here. Failures are swallowed on purpose:
   * an audit write must never block the moderation action itself.
   */
  async log(entry: {
    actorId: string;
    action: string;
    entityType: string;
    entityId?: string | null;
    detail?: string | null;
  }): Promise<void> {
    await supabase.from("admin_audit_log").insert({
      actor_id: entry.actorId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      detail: entry.detail?.slice(0, 500) ?? null,
    });
  },

  async listAuditLog(limit = 100): Promise<AuditLogRow[]> {
    const { data, error } = await supabase
      .from("admin_audit_log")
      .select(AUDIT_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as AuditLogRow[];
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
