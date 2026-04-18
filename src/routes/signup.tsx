import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/stores/cart";
import { Button } from "@/components/ui/button";
import { Field } from "./login";
import { toast } from "sonner";

const signupSearchSchema = z.object({
  redirect: fallback(z.string(), "/").default("/"),
  addProduct: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/signup")({
  validateSearch: zodValidator(signupSearchSchema),
  head: () => ({ meta: [{ title: "Create account — MarketPrime" }] }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { redirect, addProduct } = Route.useSearch();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) handlePostAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

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
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: name },
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created!");
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-6 py-16">
      <div className="rounded-2xl border bg-card p-8 shadow-soft">
        <h1 className="font-display text-2xl font-bold">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Join MarketPrime in seconds.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Field label="Full name" type="text" value={name} onChange={setName} required />
          <Field label="Email" type="email" value={email} onChange={setEmail} required />
          <Field label="Password (6+ characters)" type="password" value={password} onChange={setPassword} required />
          <Button type="submit" className="h-11 w-full bg-primary text-primary-foreground hover:opacity-90" disabled={submitting}>
            {submitting ? "Creating…" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            to="/login"
            search={{ redirect, addProduct }}
            className="font-medium text-accent hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
