import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, GraduationCap, Quote, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { initialsOf, useProfileSummary } from "@/hooks/use-profile";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { ReviewService, type ReviewRow } from "@/services/review.service";
import { SubscriptionService, TRIAL_DURATION_DAYS } from "@/services/subscription.service";

export const Route = createFileRoute("/_app/welcome")({
  head: () => ({
    meta: [
      { title: "Welcome to StudyHub — Student stories" },
      {
        name: "description",
        content:
          "See how students use StudyHub notes, quizzes and the AI tutor to revise faster — then start your 30-day premium trial.",
      },
      { property: "og:title", content: "Welcome to StudyHub — Student stories" },
      {
        property: "og:description",
        content: "Real student reviews of StudyHub, plus your free 30-day premium trial.",
      },
    ],
  }),
  component: Welcome,
});

function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <div className={cn("flex gap-0.5", className)} aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={cn(
            "size-4",
            value <= rating ? "fill-warning text-warning" : "text-muted-foreground/40",
          )}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review, index }: { review: ReviewRow; index: number }) {
  return (
    <article
      className="surface-card lift animate-in fade-in slide-in-from-bottom-2 flex flex-col gap-3 p-5 duration-500"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms`, animationFillMode: "backwards" }}
    >
      <Quote className="size-5 text-primary/60" />
      <p className="text-sm leading-relaxed text-foreground">{review.comment}</p>
      <Stars rating={review.rating} />
      <div className="mt-auto flex items-center gap-3 pt-2">
        <Avatar className="size-9">
          {review.avatar_url ? <AvatarImage src={review.avatar_url} alt="" /> : null}
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {initialsOf(review.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{review.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {review.university ?? "StudyHub student"}
          </p>
        </div>
      </div>
    </article>
  );
}

function Welcome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useProfileSummary();
  const { status } = useSubscription();

  const [name, setName] = useState("");
  const [university, setUniversity] = useState("");
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);

  const reviewsQuery = useQuery({
    queryKey: ["reviews"],
    queryFn: () => ReviewService.list(),
    staleTime: 60_000,
  });

  const submitReview = useMutation({
    mutationFn: async () => {
      if (!comment.trim()) throw new Error("Please write a short review first.");
      await ReviewService.create({
        userId: user!.id,
        name: name.trim() || profile?.display_name || "StudyHub student",
        university,
        comment,
        rating,
        avatarUrl: profile?.avatar_url ?? null,
      });
    },
    onSuccess: async () => {
      toast.success("Thanks for sharing your StudyHub story!");
      setComment("");
      await queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const continueToDashboard = useMutation({
    mutationFn: () => SubscriptionService.markOnboarded(user!.id),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["subscription", user?.id] });
      navigate({ to: "/dashboard", replace: true });
    },
  });

  return (
    <div className="space-y-10">
      <section className="glass-panel animate-in fade-in relative overflow-hidden rounded-3xl p-6 duration-500 sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 size-52 rounded-full bg-primary/15 blur-3xl" />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <GraduationCap className="size-3.5" /> Welcome to StudyHub
        </span>
        <h1 className="font-display mt-4 text-3xl font-bold sm:text-4xl">
          Hi {profile?.display_name?.split(" ")[0] ?? "there"} — you're in good company.
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Here's how other students revise with StudyHub. Your{" "}
          <strong className="text-foreground">
            {TRIAL_DURATION_DAYS}-day premium trial
          </strong>{" "}
          is already active
          {status.trialDaysLeft ? ` — ${status.trialDaysLeft} days remaining` : ""}.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            size="lg"
            onClick={() => continueToDashboard.mutate()}
            disabled={continueToDashboard.isPending}
          >
            Continue to dashboard <ArrowRight className="size-4" />
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="#share-your-story">Write a review</a>
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold">What students say</h2>
        {reviewsQuery.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((key) => (
              <Skeleton key={key} className="h-48 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(reviewsQuery.data ?? []).map((review, index) => (
              <ReviewCard key={review.id} review={review} index={index} />
            ))}
          </div>
        )}
      </section>

      <section id="share-your-story" className="surface-card space-y-4 p-6">
        <div>
          <h2 className="font-display text-xl font-semibold">Share your story</h2>
          <p className="text-sm text-muted-foreground">
            Tell other students how StudyHub helps you revise.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="review-name">Name</Label>
            <Input
              id="review-name"
              value={name}
              maxLength={80}
              placeholder={profile?.display_name ?? "Your name"}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="review-university">University</Label>
            <Input
              id="review-university"
              value={university}
              maxLength={120}
              placeholder="e.g. University of Nairobi"
              onChange={(event) => setUniversity(event.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="review-comment">Your review</Label>
          <Textarea
            id="review-comment"
            value={comment}
            maxLength={500}
            rows={4}
            placeholder="StudyHub helps me because…"
            onChange={(event) => setComment(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rating</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`Rate ${value} star${value === 1 ? "" : "s"}`}
                  onClick={() => setRating(value)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "size-5",
                      value <= rating ? "fill-warning text-warning" : "text-muted-foreground/40",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
          <Button onClick={() => submitReview.mutate()} disabled={submitReview.isPending}>
            Post review
          </Button>
        </div>
      </section>

      <div className="flex justify-center pb-4">
        <Button
          variant="ghost"
          onClick={() => continueToDashboard.mutate()}
          disabled={continueToDashboard.isPending}
        >
          Skip to dashboard <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}