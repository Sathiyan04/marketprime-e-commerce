import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { isDeviceTrusted } from "@/server/otp.functions";
import { useCart } from "@/stores/cart";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const loginSearchSchema = z.object({
  redirect: fallback(z.string(), "/").default("/"),
  addProduct: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/login")({
  validateSearch: zodValidator(loginSearchSchema),
  head: () => ({ meta: [{ title: "Sign in — MarketPrime" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect, addProduct } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const checkTrustFn = useServerFn(isDeviceTrusted);

  const handlePostAuth = async () => {
    if (addProduct) {
      const { data: p } = await supabase
        .from("products")
        .select("id, slug, title, price, image_url")
        .eq("id", addProduct)
        .maybeSingle();
      if (p) {
        useCart.getState().add({
          productId: p.id,
          slug: p.slug,
          title: p.title,
          price: Number(p.price),
          imageUrl: p.image_url,
        });
        toast.success(`${p.title} added to your cart`);
      }
    }
    navigate({ to: redirect || "/" });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Step 1: validate password
    const { data: signIn, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !signIn.user) {
      setSubmitting(false);
      toast.error(error?.message ?? "Invalid credentials");
      return;
    }

    // Step 2: check trusted device → skip OTP
    try {
      const { trusted } = await checkTrustFn({ data: { userId: signIn.user.id } });
      if (trusted) {
        setSubmitting(false);
        toast.success("Welcome back!");
        await handlePostAuth();
        return;
      }
    } catch {
      // fall through to 2FA
    }

    // Step 3: not trusted → sign out, stash creds, route to OTP
    await supabase.auth.signOut();
    sessionStorage.setItem("pendingLogin", JSON.stringify({ email, password }));
    setSubmitting(false);
    navigate({
      to: "/verify-otp",
      search: { purpose: "login", email, phone: "", redirect: addProduct ? `/?addProduct=${addProduct}` : redirect },
    });
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-6 py-16">
      <div className="rounded-2xl border bg-card p-8 shadow-soft">
        <h1 className="font-display text-2xl font-bold">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">Welcome back to MarketPrime.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Field label="Email" type="email" value={email} onChange={setEmail} required />
          <Field label="Password" type="password" value={password} onChange={setPassword} required />
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-xs font-medium text-accent hover:underline">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" className="h-11 w-full bg-primary text-primary-foreground hover:opacity-90" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link
            to="/signup"
            search={{ redirect, addProduct }}
            className="font-medium text-accent hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

export function Field({
  label, type, value, onChange, required,
}: { label: string; type: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 h-11 w-full rounded-md border border-input bg-surface px-3 text-sm outline-none transition-base focus:border-accent focus:ring-2 focus:ring-accent/20"
      />
    </label>
  );
}
