import { supabase } from "@/integrations/supabase/client";
import { StorageService } from "@/services/storage.service";
import type { Insert, Row } from "@/services/types";

const NOTES_BUCKET = "notes";
const NOTE_COLUMNS =
  "id,user_id,title,content,institution,course,unit,topic,file_url,file_name,file_type,is_public,like_count,created_at,university_id,faculty_id,programme_id,unit_id,year_of_study,semester,unit_code,lecturer,academic_year,resource_type";

export type NoteRow = Row<"notes">;
export type NewNoteInput = Omit<
  Insert<"notes">,
  "id" | "created_at" | "file_url" | "file_name" | "file_type"
> & { file?: File | null };

export const NotesService = {
  async list() {
    const { data, error } = await supabase
      .from("notes")
      .select(NOTE_COLUMNS)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  async listBookmarkedIds() {
    const { data, error } = await supabase.from("note_bookmarks").select("note_id");
    if (error) throw error;
    return new Set((data ?? []).map((row) => row.note_id));
  },

  async listLikedIds(userId: string) {
    const { data, error } = await supabase
      .from("note_likes")
      .select("note_id")
      .eq("user_id", userId);
    if (error) throw error;
    return new Set((data ?? []).map((row) => row.note_id));
  },

  async create(input: NewNoteInput): Promise<void> {
    const { file, ...rest } = input;
    let filePath: string | null = null;
    if (file) {
      filePath = StorageService.buildUserPath(input.user_id, file.name);
      await StorageService.upload(NOTES_BUCKET, filePath, file);
    }
    const { error } = await supabase.from("notes").insert({
      ...rest,
      file_url: filePath,
      file_name: file?.name ?? null,
      file_type: file?.type ?? null,
    });
    if (error) throw error;
  },

  async remove(noteId: string): Promise<void> {
    const { error } = await supabase.from("notes").delete().eq("id", noteId);
    if (error) throw error;
  },

  async getAttachmentUrl(path: string, expiresInSeconds = 60): Promise<string> {
    return StorageService.getSignedUrl(NOTES_BUCKET, path, expiresInSeconds);
  },

  async setLiked(noteId: string, userId: string, liked: boolean): Promise<void> {
    const { error } = liked
      ? await supabase.from("note_likes").insert({ note_id: noteId, user_id: userId })
      : await supabase.from("note_likes").delete().eq("note_id", noteId).eq("user_id", userId);
    if (error) throw error;
  },

  async setBookmarked(noteId: string, userId: string, bookmarked: boolean): Promise<void> {
    const { error } = bookmarked
      ? await supabase.from("note_bookmarks").insert({ note_id: noteId, user_id: userId })
      : await supabase.from("note_bookmarks").delete().eq("note_id", noteId).eq("user_id", userId);
    if (error) throw error;
  },

  /**
   * Records a download so the uploader earns download points. The table has a
   * unique (note_id, user_id) constraint, so repeat downloads never re-award.
   */
  async recordDownload(noteId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("note_downloads")
      .insert({ note_id: noteId, user_id: userId });
    // Duplicate download by the same student is expected — ignore it.
    if (error && error.code !== "23505") throw error;
  },

  async report(noteId: string, userId: string, reason: string): Promise<void> {
    const { error } = await supabase
      .from("note_reports")
      .insert({ note_id: noteId, user_id: userId, reason });
    if (error) throw error;
  },
};
