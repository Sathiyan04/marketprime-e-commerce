import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Field } from "./login";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — MarketPrime" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase places a recovery session in the URL hash; onAuthStateChange will fire PASSWORD_RECOVERY
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    // also check if we already have a session (recovery link processed)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated — you're signed in.");
    navigate({ to: "/" });
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-6 py-16">
      <div className="rounded-2xl border bg-card p-8 shadow-soft">
        <h1 className="font-display text-2xl font-bold">Set a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">Choose a strong password you haven't used before.</p>

        {!ready ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Verifying your reset link… If nothing happens, request a new link from the{" "}
            <Link to="/forgot-password" className="text-accent hover:underline">forgot password page</Link>.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field label="New password (6+ characters)" type="password" value={password} onChange={setPassword} required />
            <Field label="Confirm password" type="password" value={confirm} onChange={setConfirm} required />
            <Button type="submit" className="h-11 w-full bg-primary text-primary-foreground hover:opacity-90" disabled={submitting}>
              {submitting ? "Updating…" : "Update password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
