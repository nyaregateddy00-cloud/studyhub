import { supabase } from "@/integrations/supabase/client";

/**
 * Thin wrapper over Supabase Storage. Kept generic (bucket + path in, not
 * feature-specific) so NotesService, UserService (avatars), and future
 * Resources/PastPapers services all share one implementation — and so this
 * is the only file that needs to change if storage moves to Firebase Cloud
 * Storage or S3 later.
 */
export const StorageService = {
  async upload(bucket: string, path: string, file: File): Promise<string> {
    const { error } = await supabase.storage.from(bucket).upload(path, file);
    if (error) throw error;
    return path;
  },

  async replace(bucket: string, path: string, file: File): Promise<string> {
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) throw error;
    return path;
  },

  async remove(bucket: string, paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) throw error;
  },

  async getSignedUrl(bucket: string, path: string, expiresInSeconds = 60): Promise<string> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds);
    if (error) throw error;
    return data.signedUrl;
  },

  getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },

  buildUserPath(userId: string, fileName: string): string {
    return `${userId}/${crypto.randomUUID()}-${fileName}`;
  },
};
