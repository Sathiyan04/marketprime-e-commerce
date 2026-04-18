import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { isValidPhoneNumber } from "react-phone-number-input";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Field } from "./login";
import { PhoneField } from "@/components/auth/PhoneField";
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
  const { redirect, addProduct } = Route.useSearch();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (!phone || !isValidPhoneNumber(phone)) {
      toast.error("Please enter a valid phone number with country code.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: name, phone },
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created. Verify your email & phone to continue.");
    navigate({
      to: "/verify-otp",
      search: { purpose: "signup", email, phone, redirect: addProduct ? `/login?addProduct=${addProduct}&redirect=${redirect}` : redirect },
    });
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-6 py-16">
      <div className="rounded-2xl border bg-card p-8 shadow-soft">
        <h1 className="font-display text-2xl font-bold">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Join MarketPrime in seconds.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Field label="Full name" type="text" value={name} onChange={setName} required />
          <Field label="Email" type="email" value={email} onChange={setEmail} required />
          <PhoneField value={phone} onChange={setPhone} required />
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
