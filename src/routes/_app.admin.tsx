import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Check,
  CreditCard,
  History,
  ShieldAlert,
  ShieldCheck,
  Star,
  TimerReset,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AcademicManager } from "@/components/admin/academic-manager";
import { OverviewStats } from "@/components/admin/overview-stats";
import { useAuth } from "@/lib/auth";
import { runPremiumExpirySweep } from "@/lib/premium-expiry.functions";
import { AdminService } from "@/services/admin.service";
import { ReviewService, type ReviewStatus } from "@/services/review.service";

export const Route = createFileRoute("/_app/admin")({
  head: () => ({
    meta: [
      { title: "Admin & Moderation — StudyHub" },
      {
        name: "description",
        content: "Review reported notes and moderate community content on StudyHub.",
      },
      { property: "og:title", content: "Admin & Moderation — StudyHub" },
      { property: "og:description", content: "Reported content queue for StudyHub staff." },
    ],
  }),
  component: Admin,
});

function Admin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: role, isLoading: roleLoading } = useQuery({
    queryKey: ["my-role", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => AdminService.getStaffRole(user!.id),
  });

  const isStaff = Boolean(role?.isAdmin || role?.isModerator);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-queue"],
    enabled: isStaff,
    queryFn: () => AdminService.getModerationQueue(),
  });

  const resolve = useMutation({
    mutationFn: async (id: string) => {
      await AdminService.resolveReport(id);
      await AdminService.log({
        actorId: user!.id,
        action: "resolve_report",
        entityType: "note_report",
        entityId: id,
      });
    },
    onSuccess: async () => {
      toast.success("Report resolved");
      await queryClient.invalidateQueries({ queryKey: ["admin-queue"] });
      await queryClient.invalidateQueries({ queryKey: ["audit-log"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeNote = useMutation({
    mutationFn: async (noteId: string) => {
      await AdminService.removeNote(noteId);
      await AdminService.log({
        actorId: user!.id,
        action: "delete_note",
        entityType: "note",
        entityId: noteId,
      });
    },
    onSuccess: async () => {
      toast.success("Note removed");
      await queryClient.invalidateQueries({ queryKey: ["admin-queue"] });
      await queryClient.invalidateQueries({ queryKey: ["audit-log"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeQuestion = useMutation({
    mutationFn: async (id: string) => {
      await AdminService.removeQuestion(id);
      await AdminService.log({
        actorId: user!.id,
        action: "delete_question",
        entityType: "question",
        entityId: id,
      });
    },
    onSuccess: async () => {
      toast.success("Question removed");
      await queryClient.invalidateQueries({ queryKey: ["admin-queue"] });
      await queryClient.invalidateQueries({ queryKey: ["audit-log"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const pendingReviews = useQuery({
    queryKey: ["reviews-moderation"],
    enabled: isStaff,
    queryFn: () => ReviewService.listForModeration("pending"),
  });

  const auditLog = useQuery({
    queryKey: ["audit-log"],
    enabled: isStaff,
    queryFn: () => AdminService.listAuditLog(),
  });

  const moderateReview = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ReviewStatus }) => {
      await ReviewService.setStatus(id, status, user!.id);
      await AdminService.log({
        actorId: user!.id,
        action: status === "approved" ? "approve_review" : "reject_review",
        entityType: "review",
        entityId: id,
      });
    },
    onSuccess: async () => {
      toast.success("Review updated");
      await queryClient.invalidateQueries({ queryKey: ["reviews-moderation"] });
      await queryClient.invalidateQueries({ queryKey: ["reviews"] });
      await queryClient.invalidateQueries({ queryKey: ["audit-log"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const expirySweep = useMutation({
    mutationFn: async () => {
      const result = await runPremiumExpirySweep();
      await AdminService.log({
        actorId: user!.id,
        action: "premium_expiry_sweep",
        entityType: "subscription",
        detail: `${result.expired} account(s) moved to free`,
      });
      return result;
    },
    onSuccess: async (result) => {
      toast.success(`${result.expired} lapsed account(s) moved to free`);
      await queryClient.invalidateQueries({ queryKey: ["audit-log"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (roleLoading) return <Skeleton className="h-64" />;

  if (!isStaff) {
    return (
      <div className="surface-card flex flex-col items-center gap-3 p-12 text-center">
        <ShieldAlert className="size-8 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Staff only</h1>
        <p className="text-sm text-muted-foreground">
          This area is limited to moderators and admins.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Moderation</h1>
          <p className="mt-1 text-muted-foreground">
            Signed in as {role?.isAdmin ? "admin" : "moderator"}.
          </p>
        </div>
        {role?.isAdmin && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/payments">
                <CreditCard className="size-4" /> Payment verification
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={expirySweep.isPending}
              onClick={() => expirySweep.mutate()}
            >
              <TimerReset className="size-4" /> Run premium expiry sweep
            </Button>
          </div>
        )}
      </div>

      {isLoading || !data ? (
        <Skeleton className="h-64" />
      ) : (
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="reports">Reported notes</TabsTrigger>
            <TabsTrigger value="reviews">
              Reviews
              {(pendingReviews.data?.length ?? 0) > 0 && (
                <Badge className="ml-2" variant="destructive">
                  {pendingReviews.data?.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="community">Community</TabsTrigger>
            <TabsTrigger value="academic">Academic</TabsTrigger>
            <TabsTrigger value="audit">Audit log</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="surface-card mt-6 p-6">
            <h2 className="text-lg font-semibold">Platform overview</h2>
            <p className="mt-1 mb-5 text-sm text-muted-foreground">
              Live counts from the database, filterable by university and programme.
            </p>
            <OverviewStats />
          </TabsContent>

          <TabsContent value="academic" className="surface-card mt-6 p-6">
            <h2 className="text-lg font-semibold">Academic structure</h2>
            <p className="mt-1 mb-5 text-sm text-muted-foreground">
              Universities, schools, programmes and units used to categorise the library.
            </p>
            <AcademicManager />
          </TabsContent>

          <TabsContent value="reports" className="surface-card mt-6 p-6">
            <h2 className="text-lg font-semibold">Reported notes</h2>
            {data.reports.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Queue is clear.</p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {data.reports.map((report) => (
                  <li key={report.id} className="flex flex-wrap items-center gap-3 py-3">
                    <Badge variant={report.status === "open" ? "destructive" : "secondary"}>
                      {report.status}
                    </Badge>
                    <span className="min-w-0 flex-1 truncate text-sm">{report.reason}</span>
                    <Button size="sm" variant="outline" onClick={() => resolve.mutate(report.id)}>
                      <ShieldCheck className="mr-1 size-4" /> Resolve
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeNote.mutate(report.note_id)}
                    >
                      <Trash2 className="mr-1 size-4" /> Delete note
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="surface-card mt-6 p-6">
            <h2 className="text-lg font-semibold">Reviews awaiting approval</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              New student reviews stay hidden from the public wall until approved here.
            </p>
            {pendingReviews.isLoading ? (
              <Skeleton className="mt-4 h-24" />
            ) : (pendingReviews.data?.length ?? 0) === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Nothing waiting.</p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {pendingReviews.data?.map((review) => (
                  <li key={review.id} className="flex flex-wrap items-start gap-3 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {review.name}
                        {review.university && (
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            · {review.university}
                          </span>
                        )}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-warning">
                        {Array.from({ length: review.rating }).map((_, index) => (
                          <Star key={index} className="size-3 fill-current" />
                        ))}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          moderateReview.mutate({ id: review.id, status: "approved" })
                        }
                      >
                        <Check className="mr-1 size-4" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          moderateReview.mutate({ id: review.id, status: "rejected" })
                        }
                      >
                        <X className="mr-1 size-4" /> Reject
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="community" className="surface-card mt-6 p-6">
            <h2 className="text-lg font-semibold">Recent community posts</h2>
            <ul className="mt-4 divide-y divide-border">
              {data.questions.map((question) => (
                <li key={question.id} className="flex items-center gap-3 py-3">
                  <span className="min-w-0 flex-1 truncate text-sm">{question.title}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeQuestion.mutate(question.id)}
                  >
                    <Trash2 className="mr-1 size-4" /> Remove
                  </Button>
                </li>
              ))}
            </ul>
          </TabsContent>

          <TabsContent value="audit" className="surface-card mt-6 p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <History className="size-4" /> Staff audit log
            </h2>
            {auditLog.isLoading ? (
              <Skeleton className="mt-4 h-24" />
            ) : (auditLog.data?.length ?? 0) === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No staff actions recorded yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-border text-sm">
                {auditLog.data?.map((entry) => (
                  <li key={entry.id} className="flex flex-wrap items-center gap-3 py-3">
                    <Badge variant="secondary">{entry.action}</Badge>
                    <span className="text-muted-foreground">
                      {entry.entity_type}
                      {entry.entity_id ? ` · ${entry.entity_id.slice(0, 8)}` : ""}
                    </span>
                    {entry.detail && <span className="truncate">{entry.detail}</span>}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
