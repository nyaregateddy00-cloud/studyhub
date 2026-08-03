import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { AdminService } from "@/services/admin.service";

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
    mutationFn: (id: string) => AdminService.resolveReport(id),
    onSuccess: async () => {
      toast.success("Report resolved");
      await queryClient.invalidateQueries({ queryKey: ["admin-queue"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeNote = useMutation({
    mutationFn: (noteId: string) => AdminService.removeNote(noteId),
    onSuccess: async () => {
      toast.success("Note removed");
      await queryClient.invalidateQueries({ queryKey: ["admin-queue"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeQuestion = useMutation({
    mutationFn: (id: string) => AdminService.removeQuestion(id),
    onSuccess: async () => {
      toast.success("Question removed");
      await queryClient.invalidateQueries({ queryKey: ["admin-queue"] });
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
          <Link
            to="/admin/payments"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-accent"
          >
            <CreditCard className="size-4" /> Payment verification
          </Link>
        )}
      </div>

      {isLoading || !data ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <div className="surface-card p-6">
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
          </div>

          <div className="surface-card p-6">
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
          </div>
        </>
      )}
    </div>
  );
}
