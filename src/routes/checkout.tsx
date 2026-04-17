import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, CreditCard, Smartphone, Wallet } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/stores/cart";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Field } from "./login";
import { formatINR } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — MarketPrime" }] }),
  component: CheckoutPage,
});

type Step = "address" | "payment" | "review";
type PaymentMethod = "gpay" | "paytm" | "card";

function CheckoutPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.items.reduce((a, i) => a + i.price * i.quantity, 0));
  const clear = useCart((s) => s.clear);

  const [step, setStep] = useState<Step>("address");
  const [addr, setAddr] = useState({ full_name: "", phone: "", line1: "", line2: "", city: "", state: "", postal_code: "", country: "India" });
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
    if (items.length === 0 && !submitting) navigate({ to: "/cart" });
  }, [user, loading, items.length, navigate, submitting]);

  const shipping = subtotal > 999 ? 0 : 49;
  const total = subtotal + shipping;

  const placeOrder = async () => {
    if (!user || !payment) return;
    setSubmitting(true);
    const { data: order, error } = await supabase.from("orders").insert({
      user_id: user.id, status: "ordered", subtotal, shipping, total,
      payment_method: payment, shipping_address: addr,
    }).select().single();
    if (error || !order) { setSubmitting(false); toast.error(error?.message || "Failed"); return; }

    const { error: e2 } = await supabase.from("order_items").insert(
      items.map((i) => ({
        order_id: order.id, product_id: i.productId, title: i.title,
        price: i.price, quantity: i.quantity, image_url: i.imageUrl,
      }))
    );
    if (e2) { setSubmitting(false); toast.error(e2.message); return; }

    clear();
    toast.success("Order placed!");
    navigate({ to: "/orders" });
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Stepper step={step} />
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="rounded-xl border bg-card p-6 shadow-soft">
          {step === "address" && (
            <>
              <h2 className="font-display text-xl font-bold">Shipping address</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Full name" type="text" value={addr.full_name} onChange={(v) => setAddr({ ...addr, full_name: v })} required />
                <Field label="Phone" type="tel" value={addr.phone} onChange={(v) => setAddr({ ...addr, phone: v })} required />
                <div className="sm:col-span-2"><Field label="Address line 1" type="text" value={addr.line1} onChange={(v) => setAddr({ ...addr, line1: v })} required /></div>
                <div className="sm:col-span-2"><Field label="Address line 2 (optional)" type="text" value={addr.line2} onChange={(v) => setAddr({ ...addr, line2: v })} /></div>
                <Field label="City" type="text" value={addr.city} onChange={(v) => setAddr({ ...addr, city: v })} required />
                <Field label="State" type="text" value={addr.state} onChange={(v) => setAddr({ ...addr, state: v })} required />
                <Field label="Postal code" type="text" value={addr.postal_code} onChange={(v) => setAddr({ ...addr, postal_code: v })} required />
                <Field label="Country" type="text" value={addr.country} onChange={(v) => setAddr({ ...addr, country: v })} required />
              </div>
              <Button
                onClick={() => setStep("payment")}
                disabled={!addr.full_name || !addr.phone || !addr.line1 || !addr.city || !addr.state || !addr.postal_code}
                className="mt-6 h-11 w-full rounded-full bg-primary text-primary-foreground hover:opacity-90"
              >Continue to payment</Button>
            </>
          )}

          {step === "payment" && (
            <>
              <h2 className="font-display text-xl font-bold">Payment method</h2>
              <p className="mt-1 text-sm text-muted-foreground">Demo only — no charge will be made.</p>
              <div className="mt-5 space-y-3">
                <PayOption icon={Smartphone} label="Google Pay" sub="UPI • Instant" v="gpay" cur={payment} on={setPayment} />
                <PayOption icon={Wallet} label="Paytm Wallet" sub="Pay via Paytm balance or UPI" v="paytm" cur={payment} on={setPayment} />
                <PayOption icon={CreditCard} label="Credit / Debit Card" sub="Visa, Mastercard, RuPay, Amex" v="card" cur={payment} on={setPayment} />
              </div>
              <div className="mt-6 flex gap-3">
                <Button variant="outline" onClick={() => setStep("address")} className="h-11 flex-1 rounded-full">Back</Button>
                <Button onClick={() => setStep("review")} disabled={!payment} className="h-11 flex-1 rounded-full bg-primary text-primary-foreground hover:opacity-90">Review</Button>
              </div>
            </>
          )}

          {step === "review" && (
            <>
              <h2 className="font-display text-xl font-bold">Review your order</h2>
              <div className="mt-5 space-y-4 text-sm">
                <Section title="Shipping to">
                  <p>{addr.full_name} • {addr.phone}</p>
                  <p className="text-muted-foreground">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}, {addr.state} {addr.postal_code}, {addr.country}</p>
                </Section>
                <Section title="Payment"><p className="capitalize">{payment}</p></Section>
                <Section title={`Items (${items.length})`}>
                  <ul className="space-y-2">
                    {items.map((i) => (
                      <li key={i.productId} className="flex justify-between">
                        <span className="text-muted-foreground">{i.quantity}× {i.title}</span>
                        <span>{formatINR(i.price * i.quantity)}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              </div>
              <div className="mt-6 flex gap-3">
                <Button variant="outline" onClick={() => setStep("payment")} className="h-11 flex-1 rounded-full">Back</Button>
                <Button onClick={placeOrder} disabled={submitting} className="h-11 flex-1 rounded-full bg-accent text-accent-foreground shadow-glow hover:opacity-90">
                  {submitting ? "Placing…" : `Place order • ${formatINR(total)}`}
                </Button>
              </div>
            </>
          )}
        </div>

        <aside className="h-fit rounded-xl border bg-card p-6 shadow-soft">
          <h3 className="font-display font-bold">Summary</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground"><dt>Subtotal</dt><dd className="text-foreground">{formatINR(subtotal)}</dd></div>
            <div className="flex justify-between text-muted-foreground"><dt>Shipping</dt><dd className="text-foreground">{shipping === 0 ? "Free" : formatINR(shipping)}</dd></div>
            <div className="my-2 border-t" />
            <div className="flex justify-between"><dt className="font-semibold">Total</dt><dd className="font-display text-lg font-bold">{formatINR(total)}</dd></div>
          </dl>
          <Link to="/cart" className="mt-3 block text-center text-xs text-accent hover:underline">Edit cart</Link>
        </aside>
      </div>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps: { k: Step; l: string }[] = [{ k: "address", l: "Address" }, { k: "payment", l: "Payment" }, { k: "review", l: "Review" }];
  const idx = steps.findIndex((s) => s.k === step);
  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s.k} className="flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${i <= idx ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
            {i < idx ? <Check className="h-4 w-4" /> : i + 1}
          </div>
          <span className={`text-sm font-medium ${i === idx ? "text-foreground" : "text-muted-foreground"}`}>{s.l}</span>
          {i < steps.length - 1 && <div className={`mx-2 h-px w-8 ${i < idx ? "bg-accent" : "bg-border"}`} />}
        </div>
      ))}
    </div>
  );
}

function PayOption({ icon: Icon, label, sub, v, cur, on }: { icon: any; label: string; sub: string; v: PaymentMethod; cur: PaymentMethod | null; on: (v: PaymentMethod) => void }) {
  const active = cur === v;
  return (
    <button
      onClick={() => on(v)}
      className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-base ${active ? "border-accent bg-accent/5" : "border-border hover:border-muted-foreground/30"}`}
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${active ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      <div className={`h-4 w-4 rounded-full border-2 ${active ? "border-accent bg-accent" : "border-border"}`} />
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-surface-elevated p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}
