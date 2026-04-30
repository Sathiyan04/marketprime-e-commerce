import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Package } from "lucide-react";
import { z } from "zod";

const searchSchema = z.object({
  orderId: z.string().optional(),
  paymentId: z.string().optional(),
});

export const Route = createFileRoute("/payment-success")({
  head: () => ({ meta: [{ title: "Payment successful — MarketPrime" }] }),
  validateSearch: (s) => searchSchema.parse(s),
  component: PaymentSuccessPage,
});

function PaymentSuccessPage() {
  const { orderId, paymentId } = Route.useSearch();
  const shortId = orderId ? orderId.slice(0, 8).toUpperCase() : "—";

  return (
    <div className="mx-auto max-w-lg px-6 py-16 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
        <CheckCircle2 className="h-12 w-12 text-emerald-500" />
      </div>
      <h1 className="mt-6 font-display text-3xl font-bold">Thank you!</h1>
      <p className="mt-2 text-muted-foreground">Your payment was successful and your order is confirmed.</p>

      <div className="mt-8 rounded-xl border bg-card p-6 text-left shadow-soft">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Order ID</dt><dd className="font-mono font-semibold">#{shortId}</dd></div>
          {paymentId && (
            <div className="flex justify-between"><dt className="text-muted-foreground">Payment ID</dt><dd className="font-mono text-xs">{paymentId}</dd></div>
          )}
          <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt><dd className="font-semibold text-emerald-600">Paid</dd></div>
        </dl>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        {orderId && (
          <Link to="/orders/$id" params={{ id: orderId }} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground hover:opacity-90">
            <Package className="h-4 w-4" /> View order
          </Link>
        )}
        <Link to="/" className="inline-flex h-11 items-center justify-center rounded-full border px-6 text-sm font-medium hover:bg-accent">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}