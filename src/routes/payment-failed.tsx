import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { XCircle } from "lucide-react";
import { z } from "zod";

const searchSchema = z.object({
  orderId: z.string().optional(),
  reason: z.string().optional(),
});

export const Route = createFileRoute("/payment-failed")({
  head: () => ({ meta: [{ title: "Payment failed — MarketPrime" }] }),
  validateSearch: (s) => searchSchema.parse(s),
  component: PaymentFailedPage,
});

function PaymentFailedPage() {
  const { orderId, reason } = Route.useSearch();
  const navigate = useNavigate();
  const shortId = orderId ? orderId.slice(0, 8).toUpperCase() : "—";

  return (
    <div className="mx-auto max-w-lg px-6 py-16 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
        <XCircle className="h-12 w-12 text-destructive" />
      </div>
      <h1 className="mt-6 font-display text-3xl font-bold">Payment failed</h1>
      <p className="mt-2 text-muted-foreground">{reason || "We couldn't process your payment. No money has been charged."}</p>

      {orderId && (
        <div className="mt-8 rounded-xl border bg-card p-6 text-left shadow-soft">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Order ID</dt><dd className="font-mono font-semibold">#{shortId}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt><dd className="font-semibold text-destructive">Unpaid</dd></div>
          </dl>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          onClick={() => navigate({ to: "/checkout" })}
          className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Try again
        </button>
        <Link to="/cart" className="inline-flex h-11 items-center justify-center rounded-full border px-6 text-sm font-medium hover:bg-accent">
          Back to cart
        </Link>
      </div>
    </div>
  );
}