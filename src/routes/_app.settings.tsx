import { createFileRoute } from "@tanstack/react-router";
import { LogOut, Moon, ShieldCheck, Sun } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth, useSignOut } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { AuthService } from "@/services/auth.service";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — StudyHub" },
      {
        name: "description",
        content: "Manage appearance, account security and your StudyHub session.",
      },
      { property: "og:title", content: "Settings — StudyHub" },
      { property: "og:description", content: "Appearance, password and account controls." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { theme, toggle } = useTheme();
  const { user } = useAuth();
  const signOut = useSignOut();

  async function sendReset() {
    if (!user?.email) return;
    try {
      await AuthService.requestPasswordReset(
        user.email,
        `${window.location.origin}/reset-password`,
      );
      toast.success("Password reset email sent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-muted-foreground">Appearance, security and account.</p>
      </div>

      <div className="surface-card space-y-4 p-6">
        <h2 className="text-lg font-semibold">Appearance</h2>
        <div className="flex items-center justify-between">
          <Label htmlFor="dark-mode" className="flex items-center gap-2">
            {theme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
            Dark mode
          </Label>
          <Switch id="dark-mode" checked={theme === "dark"} onCheckedChange={toggle} />
        </div>
      </div>

      <div className="surface-card space-y-4 p-6">
        <h2 className="text-lg font-semibold">Account</h2>
        <p className="text-sm text-muted-foreground">Signed in as {user?.email}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={sendReset}>
            <ShieldCheck className="mr-1 size-4" /> Send password reset
          </Button>
          <Button variant="ghost" onClick={signOut}>
            <LogOut className="mr-1 size-4" /> Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
