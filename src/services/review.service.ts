import { supabase } from "@/integrations/supabase/client";
import type { Row } from "@/services/types";

export type ReviewRow = Pick<
  Row<"reviews">,
  "id" | "user_id" | "name" | "university" | "comment" | "rating" | "avatar_url" | "created_at"
>;

const REVIEW_COLUMNS = "id,user_id,name,university,comment,rating,avatar_url,created_at";

export const ReviewService = {
  async list(limit = 24): Promise<ReviewRow[]> {
    const { data, error } = await supabase
      .from("reviews")
      .select(REVIEW_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as ReviewRow[];
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
    });
    if (error) throw error;
  },
};