import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, ShieldAlert, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAuth } from "@/lib/auth";
import { AdminService } from "@/services/admin.service";
import { SubscriptionService } from "@/services/subscription.service";

export const Route = createFileRoute("/_app/admin_/payments")({
  head: () => ({
    meta: [
      { title: "Payment verification — StudyHub Admin" },
      {
        name: "description",
        content: "Approve or reject M-Pesa premium payment requests from StudyHub students.",
      },
      { property: "og:title", content: "Payment verification — StudyHub Admin" },
      {
        property: "og:description",
        content: "Premium payment approval queue for StudyHub admins.",
      },
    ],
  }),
  component: AdminPayments,
});

type Filter = "pending" | "approved" | "rejected" | "all";

function AdminPayments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("pending");

  const { data: role, isLoading: roleLoading } = useQuery({
    queryKey: ["my-role", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => AdminService.getStaffRole(user!.id),
  });

  const isAdmin = Boolean(role?.isAdmin);

  const paymentsQuery = useQuery({
    queryKey: ["admin-payments"],
    enabled: isAdmin,
    queryFn: () => SubscriptionService.allPayments(),
  });

  const decide = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "approved" | "rejected" }) =>
      SubscriptionService.setPaymentStatus(id, status),
    onSuccess: async (_data, variables) => {
      toast.success(
        variables.status === "approved"
          ? "Payment approved — premium activated for 7 days."
          : "Payment rejected.",
      );
      await queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (roleLoading) return <Skeleton className="h-64" />;

  if (!isAdmin) {
    return (
      <div className="surface-card flex flex-col items-center gap-3 p-12 text-center">
        <ShieldAlert className="size-8 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Admins only</h1>
        <p className="text-sm text-muted-foreground">
          Payment verification is limited to StudyHub admins.
        </p>
      </div>
    );
  }

  const payments = (paymentsQuery.data ?? []).filter((payment) =>
    filter === "all" ? true : payment.status === filter,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment verification"
        description="Approve M-Pesa payments to activate 7 days of premium."
      />

      <ToggleGroup
        type="single"
        value={filter}
        onValueChange={(value) => value && setFilter(value as Filter)}
        variant="outline"
        size="sm"
      >
        {(["pending", "approved", "rejected", "all"] as const).map((value) => (
          <ToggleGroupItem key={value} value={value} className="capitalize">
            {value}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {paymentsQuery.isLoading ? (
        <Skeleton className="h-48" />
      ) : payments.length === 0 ? (
        <div className="surface-card p-10 text-center text-sm text-muted-foreground">
          No {filter === "all" ? "" : filter} payment requests.
        </div>
      ) : (
        <ul className="space-y-3">
          {payments.map((payment) => (
            <li
              key={payment.id}
              className="surface-card flex flex-wrap items-center gap-3 p-4 sm:gap-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-mono text-sm font-semibold">{payment.transaction_code}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {payment.phone_number} · {payment.email ?? "no email"} · KSh{" "}
                  {Number(payment.amount)} · {new Date(payment.created_at).toLocaleString()}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">user {payment.user_id}</p>
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
              {payment.status === "pending" && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => decide.mutate({ id: payment.id, status: "approved" })}
                    disabled={decide.isPending}
                  >
                    <Check className="size-4" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => decide.mutate({ id: payment.id, status: "rejected" })}
                    disabled={decide.isPending}
                  >
                    <X className="size-4" /> Reject
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
