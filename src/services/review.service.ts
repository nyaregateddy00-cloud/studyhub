import { supabase } from "@/integrations/supabase/client";
import type { Row } from "@/services/types";

export type ReviewStatus = "pending" | "approved" | "rejected";

export type ReviewRow = Pick<
  Row<"reviews">,
  | "id"
  | "user_id"
  | "name"
  | "university"
  | "comment"
  | "rating"
  | "avatar_url"
  | "created_at"
  | "status"
>;

const REVIEW_COLUMNS = "id,user_id,name,university,comment,rating,avatar_url,created_at,status";

export const ReviewService = {
  /** Public wall — row-level security already hides anything not approved. */
  async list(limit = 24): Promise<ReviewRow[]> {
    const { data, error } = await supabase
      .from("reviews")
      .select(REVIEW_COLUMNS)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as ReviewRow[];
  },

  /** Moderation queue — only staff can read non-approved rows. */
  async listForModeration(status: ReviewStatus = "pending"): Promise<ReviewRow[]> {
    const { data, error } = await supabase
      .from("reviews")
      .select(REVIEW_COLUMNS)
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data ?? []) as ReviewRow[];
  },

  async setStatus(id: string, status: ReviewStatus, reviewerId: string): Promise<void> {
    const { error } = await supabase
      .from("reviews")
      .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: reviewerId })
      .eq("id", id);
    if (error) throw error;
  },

  async create(input: {
    userId: string;
    name: string;
    university: string;
    comment: string;
    rating: number;
    avatarUrl?: string | null;
  }): Promise<void> {
    const { error } = await supabase.from("reviews").insert({
      user_id: input.userId,
      name: input.name.trim().slice(0, 80),
      university: input.university.trim().slice(0, 120) || null,
      comment: input.comment.trim().slice(0, 500),
      rating: Math.min(5, Math.max(1, Math.round(input.rating))),
      avatar_url: input.avatarUrl ?? null,
      status: "pending",
    });
    if (error) throw error;
  },
};
