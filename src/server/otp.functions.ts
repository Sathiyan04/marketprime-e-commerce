// Mock OTP server functions: codes are generated, hashed, stored in DB,
// and returned in the response (devCode) instead of being emailed/SMSed.
// Swap the "delivery" branch later for Twilio/Resend without touching the API surface.
import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import crypto from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const OTP_TTL_MIN = 10;
const RESEND_COOLDOWN_SEC = 60;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MIN = 15;
const TRUST_DEVICE_DAYS = 30;
const TRUST_COOKIE = "mp_trusted_device";

function genCode() {
  // cryptographically random 6-digit
  const n = crypto.randomInt(0, 1_000_000);
  return n.toString().padStart(6, "0");
}
function hash(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

const requestSchema = z.object({
  identifier: z.string().min(3).max(255),
  channel: z.enum(["email", "sms"]),
  purpose: z.enum(["signup", "login"]),
});

export const requestOtp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => requestSchema.parse(d))
  .handler(async ({ data }) => {
    const { identifier, channel, purpose } = data;
    const now = new Date();

    // Check lockout / cooldown
    const { data: rl } = await supabaseAdmin
      .from("otp_rate_limits")
      .select("*")
      .eq("identifier", identifier)
      .eq("channel", channel)
      .maybeSingle();

    if (rl?.locked_until && new Date(rl.locked_until) > now) {
      const mins = Math.ceil((new Date(rl.locked_until).getTime() - now.getTime()) / 60000);
      throw new Error(`Too many attempts. Try again in ${mins} minute(s).`);
    }
    if (rl?.last_sent_at) {
      const diff = (now.getTime() - new Date(rl.last_sent_at).getTime()) / 1000;
      if (diff < RESEND_COOLDOWN_SEC) {
        throw new Error(`Please wait ${Math.ceil(RESEND_COOLDOWN_SEC - diff)}s before resending.`);
      }
    }

    // Invalidate prior unconsumed codes for this identifier+channel+purpose
    await supabaseAdmin
      .from("otp_codes")
      .update({ consumed_at: now.toISOString() })
      .eq("identifier", identifier)
      .eq("channel", channel)
      .eq("purpose", purpose)
      .is("consumed_at", null);

    const code = genCode();
    const expires_at = new Date(now.getTime() + OTP_TTL_MIN * 60_000).toISOString();

    const { error: insErr } = await supabaseAdmin.from("otp_codes").insert({
      identifier,
      channel,
      purpose,
      code_hash: hash(code),
      expires_at,
    });
    if (insErr) throw new Error(insErr.message);

    // Update rate-limit row (upsert)
    await supabaseAdmin
      .from("otp_rate_limits")
      .upsert(
        {
          identifier,
          channel,
          last_sent_at: now.toISOString(),
          // keep failed_attempts as-is on resend
          failed_attempts: rl?.failed_attempts ?? 0,
          locked_until: rl?.locked_until ?? null,
        },
        { onConflict: "identifier,channel" },
      );

    // MOCK delivery: log + return code so UI can toast it.
    // Replace this branch later with Twilio / Resend / etc.
    console.log(`[MOCK OTP] ${channel.toUpperCase()} → ${identifier}: ${code} (purpose=${purpose})`);

    return {
      ok: true as const,
      devCode: code, // dev-only convenience; remove when real delivery is wired
      expiresInMinutes: OTP_TTL_MIN,
    };
  });

const verifySchema = z.object({
  identifier: z.string().min(3).max(255),
  channel: z.enum(["email", "sms"]),
  purpose: z.enum(["signup", "login"]),
  code: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
});

export const verifyOtp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => verifySchema.parse(d))
  .handler(async ({ data }) => {
    const { identifier, channel, purpose, code } = data;
    const now = new Date();

    // Lockout check
    const { data: rl } = await supabaseAdmin
      .from("otp_rate_limits")
      .select("*")
      .eq("identifier", identifier)
      .eq("channel", channel)
      .maybeSingle();

    if (rl?.locked_until && new Date(rl.locked_until) > now) {
      const mins = Math.ceil((new Date(rl.locked_until).getTime() - now.getTime()) / 60000);
      throw new Error(`Account temporarily locked. Try again in ${mins} minute(s).`);
    }

    const { data: otp } = await supabaseAdmin
      .from("otp_codes")
      .select("*")
      .eq("identifier", identifier)
      .eq("channel", channel)
      .eq("purpose", purpose)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otp) throw new Error("No active code. Please request a new one.");
    if (new Date(otp.expires_at) < now) throw new Error("Code expired. Request a new one.");

    const matches = otp.code_hash === hash(code);

    if (!matches) {
      const newAttempts = (rl?.failed_attempts ?? 0) + 1;
      const shouldLock = newAttempts >= MAX_ATTEMPTS;
      await supabaseAdmin.from("otp_rate_limits").upsert(
        {
          identifier,
          channel,
          failed_attempts: newAttempts,
          locked_until: shouldLock
            ? new Date(now.getTime() + LOCKOUT_MIN * 60_000).toISOString()
            : rl?.locked_until ?? null,
          last_sent_at: rl?.last_sent_at ?? null,
        },
        { onConflict: "identifier,channel" },
      );
      // bump attempts on the OTP row too
      await supabaseAdmin
        .from("otp_codes")
        .update({ attempts: (otp.attempts ?? 0) + 1 })
        .eq("id", otp.id);

      if (shouldLock) {
        throw new Error(`Too many wrong attempts. Locked for ${LOCKOUT_MIN} minutes.`);
      }
      throw new Error(`Incorrect code. ${MAX_ATTEMPTS - newAttempts} attempt(s) left.`);
    }

    // Mark consumed + reset rate limits
    await supabaseAdmin
      .from("otp_codes")
      .update({ consumed_at: now.toISOString() })
      .eq("id", otp.id);

    await supabaseAdmin.from("otp_rate_limits").upsert(
      {
        identifier,
        channel,
        failed_attempts: 0,
        locked_until: null,
        last_sent_at: rl?.last_sent_at ?? null,
      },
      { onConflict: "identifier,channel" },
    );

    return { ok: true as const };
  });

// Mark profile flags after both channels verified at signup, or single channel at login
const markVerifiedSchema = z.object({
  userId: z.string().uuid(),
  email: z.boolean().optional(),
  phone: z.boolean().optional(),
});

export const markProfileVerified = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => markVerifiedSchema.parse(d))
  .handler(async ({ data }) => {
    const update: { email_verified?: boolean; phone_verified?: boolean } = {};
    if (data.email) update.email_verified = true;
    if (data.phone) update.phone_verified = true;
    if (Object.keys(update).length === 0) return { ok: true as const };
    const { error } = await supabaseAdmin
      .from("profiles")
      .update(update)
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---------- Trusted device (30-day 2FA bypass) ----------
const trustSchema = z.object({ userId: z.string().uuid() });

export const trustDevice = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => trustSchema.parse(d))
  .handler(async ({ data }) => {
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + TRUST_DEVICE_DAYS * 24 * 60 * 60 * 1000);

    const { error } = await supabaseAdmin.from("trusted_devices").insert({
      user_id: data.userId,
      token_hash: hash(token),
      expires_at: expires.toISOString(),
    });
    if (error) throw new Error(error.message);

    setCookie(TRUST_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: TRUST_DEVICE_DAYS * 24 * 60 * 60,
    });

    return { ok: true as const };
  });

const checkTrustSchema = z.object({ userId: z.string().uuid() });

export const isDeviceTrusted = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => checkTrustSchema.parse(d))
  .handler(async ({ data }) => {
    const token = getCookie(TRUST_COOKIE);
    if (!token) return { trusted: false as const };
    const { data: row } = await supabaseAdmin
      .from("trusted_devices")
      .select("id, expires_at")
      .eq("user_id", data.userId)
      .eq("token_hash", hash(token))
      .maybeSingle();
    if (!row) return { trusted: false as const };
    if (new Date(row.expires_at) < new Date()) return { trusted: false as const };
    await supabaseAdmin
      .from("trusted_devices")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", row.id);
    return { trusted: true as const };
  });
