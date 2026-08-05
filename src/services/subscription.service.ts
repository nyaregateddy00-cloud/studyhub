import { supabase } from "@/integrations/supabase/client";
import type { Row } from "@/services/types";

export type PlanKind = "trial" | "free" | "premium";

export type SubscriptionRow = Pick<
  Row<"profiles">,
  | "id"
  | "plan"
  | "premium_status"
  | "trial_start_date"
  | "trial_end_date"
  | "premium_start_date"
  | "premium_end_date"
  | "onboarded_at"
>;

export type PaymentRow = Pick<
  Row<"payments">,
  | "id"
  | "user_id"
  | "transaction_code"
  | "phone_number"
  | "email"
  | "amount"
  | "currency"
  | "status"
  | "created_at"
  | "reviewed_at"
>;

const SUBSCRIPTION_COLUMNS =
  "id,plan,premium_status,trial_start_date,trial_end_date,premium_start_date,premium_end_date,onboarded_at";

const PAYMENT_COLUMNS =
  "id,user_id,transaction_code,phone_number,email,amount,currency,status,created_at,reviewed_at";

/** Pricing is intentionally in one place so an M-Pesa STK Push flow can reuse it. */
export const PREMIUM_PRICE_KES = 49;
export const PREMIUM_DURATION_DAYS = 7;
export const TRIAL_DURATION_DAYS = 30;

/** What a free-plan user gets per day. Premium/trial users are unlimited. */
export const FREE_LIMITS = {
  ai_message: 5,
  download: 3,
} as const;

export type UsageKind = keyof typeof FREE_LIMITS;

export type SubscriptionStatus = {
  plan: PlanKind;
  isPremium: boolean;
  isTrial: boolean;
  trialDaysLeft: number;
  premiumDaysLeft: number;
  trialEndsAt: Date | null;
  premiumEndsAt: Date | null;
  onboarded: boolean;
};

function daysBetween(from: Date, to: Date) {
  return Math.max(0, Math.ceil((to.getTime() - from.getTime()) / 86_400_000));
}

/** Pure derivation so the UI, guards and limits all agree on one truth. */
export function deriveStatus(row: SubscriptionRow | null): SubscriptionStatus {
  const now = new Date();
  const trialEndsAt = row?.trial_end_date ? new Date(row.trial_end_date) : null;
  const premiumEndsAt = row?.premium_end_date ? new Date(row.premium_end_date) : null;

  const premiumActive = Boolean(premiumEndsAt && premiumEndsAt > now);
  const trialActive = !premiumActive && Boolean(trialEndsAt && trialEndsAt > now);

  return {
    plan: premiumActive ? "premium" : trialActive ? "trial" : "free",
    isPremium: premiumActive || trialActive,
    isTrial: trialActive,
    trialDaysLeft: trialEndsAt ? daysBetween(now, trialEndsAt) : 0,
    premiumDaysLeft: premiumEndsAt ? daysBetween(now, premiumEndsAt) : 0,
    trialEndsAt,
    premiumEndsAt,
    onboarded: Boolean(row?.onboarded_at),
  };
}

export const SubscriptionService = {
  async get(userId: string): Promise<SubscriptionRow | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select(SUBSCRIPTION_COLUMNS)
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as SubscriptionRow | null;
  },

  async markOnboarded(userId: string): Promise<void> {
    const { error } = await supabase
      .from("profiles")
      .update({ onboarded_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) throw error;
  },

  /** Manual M-Pesa verification today; an STK Push callback can write the same row later. */
  async submitPayment(input: {
    userId: string;
    transactionCode: string;
    phoneNumber: string;
    email: string;
  }): Promise<void> {
    const { error } = await supabase.from("payments").insert({
      user_id: input.userId,
      transaction_code: input.transactionCode.trim().toUpperCase(),
      phone_number: input.phoneNumber.trim(),
      email: input.email.trim(),
      amount: PREMIUM_PRICE_KES,
      currency: "KES",
      method: "mpesa_manual",
      status: "pending",
    });
    if (error) throw error;
  },

  async myPayments(userId: string): Promise<PaymentRow[]> {
    const { data, error } = await supabase
      .from("payments")
      .select(PAYMENT_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as PaymentRow[];
  },

  /** Admin-only (RLS enforces it): every payment request, newest first. */
  async allPayments(): Promise<PaymentRow[]> {
    const { data, error } = await supabase
      .from("payments")
      .select(PAYMENT_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data ?? []) as PaymentRow[];
  },

  /** Approving flips the payer to premium for 7 days via a database trigger. */
  async setPaymentStatus(id: string, status: "approved" | "rejected"): Promise<void> {
    const { error } = await supabase.from("payments").update({ status }).eq("id", id);
    if (error) throw error;
  },

  async countUsageToday(userId: string, kind: UsageKind): Promise<number> {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const { count, error } = await supabase
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("kind", kind)
      .gte("created_at", since.toISOString());
    if (error) throw error;
    return count ?? 0;
  },

  async recordUsage(userId: string, kind: UsageKind): Promise<void> {
    await supabase.from("usage_events").insert({ user_id: userId, kind });
  },
};
