import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  BadgeCheck,
  Bot,
  Check,
  Crown,
  Download,
  FileStack,
  Smartphone,
  TimerReset,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuth } from "@/lib/auth";
import {
  FREE_LIMITS,
  PREMIUM_DURATION_DAYS,
  PREMIUM_PRICE_KES,
  SubscriptionService,
} from "@/services/subscription.service";

export const Route = createFileRoute("/_app/premium")({
  head: () => ({
    meta: [
      { title: "StudyHub Premium — KSh 49 for 7 days" },
      {
        name: "description",
        content:
          "Unlock unlimited AI tutor chats, downloads, quizzes and premium notes on StudyHub for KSh 49 per week.",
      },
      { property: "og:title", content: "StudyHub Premium — KSh 49 for 7 days" },
      {
        property: "og:description",
        content: "Unlimited AI tutoring, downloads and quizzes for KSh 49 a week.",
      },
    ],
  }),
  component: Premium,
});

const benefits = [
  {
    icon: Download,
    title: "Unlimited downloads",
    body: "Save every note and past paper you need.",
  },
  { icon: Bot, title: "Unlimited AI tutor", body: "Ask as many questions as your revision needs." },
  { icon: FileStack, title: "Unlimited quizzes", body: "Generate quizzes from any PDF, any time." },
  { icon: Crown, title: "Premium resources", body: "Priority access to premium notes and packs." },
];

function Premium() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { status, isLoading } = useSubscription();
  const [open, setOpen] = useState(false);
  const [transactionCode, setTransactionCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");

  const paymentsQuery = useQuery({
    queryKey: ["my-payments", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => SubscriptionService.myPayments(user!.id),
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (transactionCode.trim().length < 6) throw new Error("Enter your M-Pesa transaction code.");
      if (phoneNumber.trim().length < 9) throw new Error("Enter the phone number you paid with.");
      await SubscriptionService.submitPayment({
        userId: user!.id,
        transactionCode,
        phoneNumber,
        email: email || user?.email || "",
      });
    },
    onSuccess: async () => {
      toast.success("Payment submitted — we'll activate premium once it's verified.");
      setOpen(false);
      setTransactionCode("");
      await queryClient.invalidateQueries({ queryKey: ["my-payments", user?.id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const statusLabel =
    status.plan === "premium"
      ? `Premium active · ${status.premiumDaysLeft} day${status.premiumDaysLeft === 1 ? "" : "s"} left`
      : status.plan === "trial"
        ? `Free trial · ${status.trialDaysLeft} day${status.trialDaysLeft === 1 ? "" : "s"} left`
        : "Free plan";

  return (
    <div className="space-y-8">
      <PageHeader
        title="StudyHub Premium"
        description="Everything unlocked, for less than a matatu fare."
      />

      {isLoading ? (
        <Skeleton className="h-24 rounded-2xl" />
      ) : (
        <div className="surface-card animate-in fade-in flex flex-wrap items-center gap-4 p-6 duration-500">
          <span className="rounded-2xl bg-primary/10 p-3 text-primary">
            {status.plan === "premium" ? (
              <Crown className="size-6" />
            ) : (
              <TimerReset className="size-6" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">Current subscription</p>
            <p className="font-display text-lg font-semibold">{statusLabel}</p>
            {status.plan === "free" && (
              <p className="mt-1 text-xs text-muted-foreground">
                Free plan: {FREE_LIMITS.ai_message} AI tutor messages and {FREE_LIMITS.download}{" "}
                downloads per day.
              </p>
            )}
          </div>
          <Badge variant={status.isPremium ? "default" : "secondary"}>
            {status.plan.toUpperCase()}
          </Badge>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        {benefits.map((benefit, index) => (
          <div
            key={benefit.title}
            className="surface-card lift animate-in fade-in slide-in-from-bottom-2 flex gap-3 p-5 duration-500"
            style={{ animationDelay: `${index * 60}ms`, animationFillMode: "backwards" }}
          >
            <span className="h-fit rounded-xl bg-primary/10 p-2 text-primary">
              <benefit.icon className="size-5" />
            </span>
            <div>
              <p className="font-semibold">{benefit.title}</p>
              <p className="text-sm text-muted-foreground">{benefit.body}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
        <div className="glass-panel rounded-3xl border border-primary/25 p-6">
          <p className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Crown className="size-4" /> StudyHub Premium
          </p>
          <p className="font-display mt-3 text-4xl font-bold">
            KSh {PREMIUM_PRICE_KES}
            <span className="text-base font-medium text-muted-foreground">
              {" "}
              / {PREMIUM_DURATION_DAYS} days
            </span>
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {[
              "Unlimited downloads",
              "Unlimited AI tutor usage",
              "Unlimited quizzes",
              "Premium notes & resources",
              "Full StudyHub experience",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check className="size-4 text-success" /> {item}
              </li>
            ))}
          </ul>
          <Button className="mt-6 w-full" size="lg" onClick={() => setOpen(true)}>
            Upgrade to Premium
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Pay with M-Pesa · activated after verification
          </p>
        </div>

        <div className="surface-card space-y-4 p-6">
          <h2 className="font-display text-lg font-semibold">Your payment requests</h2>
          {paymentsQuery.isLoading ? (
            <Skeleton className="h-20" />
          ) : (paymentsQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No payments yet. Upgrade above and your request will appear here.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {(paymentsQuery.data ?? []).map((payment) => (
                <li key={payment.id} className="flex items-center gap-3 py-3">
                  <BadgeCheck className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{payment.transaction_code}</p>
                    <p className="text-xs text-muted-foreground">
                      KSh {Number(payment.amount)} ·{" "}
                      {new Date(payment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    variant={
                      payment.status === "approved"
                        ? "default"
                        : payment.status === "rejected"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {payment.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="size-4" /> Pay KSh {PREMIUM_PRICE_KES} with M-Pesa
            </DialogTitle>
            <DialogDescription>
              Send KSh {PREMIUM_PRICE_KES} to the StudyHub M-Pesa till, then submit the confirmation
              details below. Premium is activated as soon as an admin verifies the payment.
            </DialogDescription>
          </DialogHeader>

          <ol className="list-decimal space-y-1 rounded-xl bg-muted/50 p-4 pl-8 text-sm text-muted-foreground">
            <li>Open M-Pesa → Lipa na M-Pesa → Buy Goods and Services.</li>
            <li>Enter the StudyHub till number and amount KSh {PREMIUM_PRICE_KES}.</li>
            <li>Copy the confirmation (transaction) code from the SMS.</li>
          </ol>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="tx-code">M-Pesa transaction code</Label>
              <Input
                id="tx-code"
                value={transactionCode}
                placeholder="e.g. SFA1B2C3D4"
                maxLength={20}
                onChange={(event) => setTransactionCode(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-phone">Phone number</Label>
              <Input
                id="tx-phone"
                value={phoneNumber}
                placeholder="07XX XXX XXX"
                maxLength={20}
                onChange={(event) => setPhoneNumber(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-email">Account email</Label>
              <Input
                id="tx-email"
                type="email"
                value={email}
                maxLength={255}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
              Submit payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
