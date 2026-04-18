import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Mail, Smartphone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  requestOtp,
  verifyOtp,
  markProfileVerified,
  trustDevice,
} from "@/server/otp.functions";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Checkbox } from "@/components/ui/checkbox";

const search = z.object({
  purpose: fallback(z.enum(["signup", "login"]), "login").default("login"),
  email: fallback(z.string(), "").default(""),
  phone: fallback(z.string(), "").default(""),
  redirect: fallback(z.string(), "/").default("/"),
});

export const Route = createFileRoute("/verify-otp")({
  validateSearch: zodValidator(search),
  head: () => ({ meta: [{ title: "Verify your account — MarketPrime" }] }),
  component: VerifyOtpPage,
});

function VerifyOtpPage() {
  const { purpose, email, phone, redirect } = Route.useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();

  const requestFn = useServerFn(requestOtp);
  const verifyFn = useServerFn(verifyOtp);
  const markFn = useServerFn(markProfileVerified);
  const trustFn = useServerFn(trustDevice);

  const channels = (purpose === "signup" ? ["email", "sms"] : ["email"]) as Array<"email" | "sms">;

  const [emailCode, setEmailCode] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [smsVerified, setSmsVerified] = useState(false);
  const [trust, setTrust] = useState(false);
  const [busy, setBusy] = useState<null | "verify" | "resend-email" | "resend-sms">(null);
  const [cooldownEmail, setCooldownEmail] = useState(0);
  const [cooldownSms, setCooldownSms] = useState(0);
  const sentRef = useRef(false);

  // Send initial codes once on mount
  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;
    if (!email) {
      toast.error("Missing email. Please sign in again.");
      navigate({ to: "/login" });
      return;
    }
    void sendCode("email");
    if (channels.includes("sms")) void sendCode("sms");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // cooldown ticks
  useEffect(() => {
    if (cooldownEmail <= 0) return;
    const t = setTimeout(() => setCooldownEmail((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldownEmail]);
  useEffect(() => {
    if (cooldownSms <= 0) return;
    const t = setTimeout(() => setCooldownSms((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldownSms]);

  const sendCode = async (channel: "email" | "sms") => {
    const identifier = channel === "email" ? email : phone;
    if (!identifier) return;
    setBusy(channel === "email" ? "resend-email" : "resend-sms");
    try {
      const res = await requestFn({ data: { identifier, channel, purpose } });
      // Dev-only: surface code via toast
      toast.success(
        `${channel === "email" ? "Email" : "SMS"} code sent (dev): ${res.devCode}`,
        { duration: 8000 },
      );
      if (channel === "email") setCooldownEmail(60);
      else setCooldownSms(60);
    } catch (e: any) {
      toast.error(e.message ?? "Could not send code");
    } finally {
      setBusy(null);
    }
  };

  const verifyChannel = async (channel: "email" | "sms", code: string) => {
    const identifier = channel === "email" ? email : phone;
    await verifyFn({ data: { identifier, channel, purpose, code } });
    if (channel === "email") setEmailVerified(true);
    else setSmsVerified(true);
  };

  const onConfirm = async () => {
    setBusy("verify");
    try {
      // Verify whichever channels haven't been confirmed yet
      if (!emailVerified) await verifyChannel("email", emailCode);
      if (channels.includes("sms") && !smsVerified) await verifyChannel("sms", smsCode);

      // Update profile flags + trusted device if user already has a session
      if (user) {
        await markFn({
          data: {
            userId: user.id,
            email: true,
            phone: channels.includes("sms") ? true : undefined,
          },
        });
        if (trust) {
          await trustFn({ data: { userId: user.id } });
        }
      } else if (purpose === "login") {
        // pending login flow: re-establish session from stored creds
        const pending = sessionStorage.getItem("pendingLogin");
        if (pending) {
          const { email: e, password } = JSON.parse(pending);
          const { data, error } = await supabase.auth.signInWithPassword({ email: e, password });
          sessionStorage.removeItem("pendingLogin");
          if (error) throw error;
          if (data.user && trust) await trustFn({ data: { userId: data.user.id } });
        }
      }

      toast.success("Verified! Welcome.");
      navigate({ to: redirect || "/" });
    } catch (e: any) {
      toast.error(e.message ?? "Verification failed");
    } finally {
      setBusy(null);
    }
  };

  const allFilled =
    emailCode.length === 6 && (!channels.includes("sms") || smsCode.length === 6);

  return (
    <div className="mx-auto flex max-w-md flex-col px-6 py-10">
      <div className="rounded-2xl border bg-card p-6 shadow-soft sm:p-8">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-accent" />
          <h1 className="font-display text-xl font-bold sm:text-2xl">Verify it's you</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {purpose === "signup"
            ? "Enter the 6-digit codes we sent to your email and phone."
            : "Enter the 6-digit code we sent to your email."}
        </p>

        <div className="mt-6 space-y-6">
          <ChannelBlock
            icon={<Mail className="h-4 w-4" />}
            label="Email"
            target={email}
            value={emailCode}
            onChange={setEmailCode}
            verified={emailVerified}
            cooldown={cooldownEmail}
            onResend={() => sendCode("email")}
            resending={busy === "resend-email"}
          />

          {channels.includes("sms") && (
            <ChannelBlock
              icon={<Smartphone className="h-4 w-4" />}
              label="Phone"
              target={phone}
              value={smsCode}
              onChange={setSmsCode}
              verified={smsVerified}
              cooldown={cooldownSms}
              onResend={() => sendCode("sms")}
              resending={busy === "resend-sms"}
            />
          )}

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={trust} onCheckedChange={(v) => setTrust(!!v)} />
            <span>Trust this device for 30 days (skip 2FA next time)</span>
          </label>

          <Button
            onClick={onConfirm}
            disabled={!allFilled || busy === "verify"}
            className="h-11 w-full bg-primary text-primary-foreground hover:opacity-90"
          >
            {busy === "verify" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm & continue
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            <Link to="/login" className="hover:underline">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function ChannelBlock({
  icon, label, target, value, onChange, verified, cooldown, onResend, resending,
}: {
  icon: React.ReactNode;
  label: string;
  target: string;
  value: string;
  onChange: (v: string) => void;
  verified: boolean;
  cooldown: number;
  onResend: () => void;
  resending: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {icon} {label} • <span className="text-foreground">{maskTarget(target)}</span>
        </div>
        {verified ? (
          <span className="text-xs font-semibold text-accent">Verified ✓</span>
        ) : (
          <button
            type="button"
            onClick={onResend}
            disabled={cooldown > 0 || resending}
            className="text-xs font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resending ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
          </button>
        )}
      </div>
      <InputOTP
        maxLength={6}
        value={value}
        onChange={onChange}
        disabled={verified}
      >
        <InputOTPGroup>
          {Array.from({ length: 6 }).map((_, i) => (
            <InputOTPSlot key={i} index={i} className="h-11 w-11" />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </div>
  );
}

function maskTarget(t: string) {
  if (!t) return "";
  if (t.includes("@")) {
    const [u, d] = t.split("@");
    return `${u.slice(0, 2)}***@${d}`;
  }
  return `${t.slice(0, 3)}•••${t.slice(-2)}`;
}
