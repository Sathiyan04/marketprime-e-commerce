import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/format";
import { Smartphone, CreditCard, Wallet, Loader2 } from "lucide-react";

type Method = "gpay" | "paytm" | "card";

interface Props {
  orderId: string;
  amount: number;
  method: Method;
  onSuccess: () => void;
  onFailure: (reason: string) => void;
}

const UPI_APPS = [
  { id: "gpay", label: "Google Pay", icon: Smartphone, sub: "UPI • Recommended" },
  { id: "phonepe", label: "PhonePe", icon: Smartphone, sub: "UPI" },
  { id: "paytm", label: "Paytm", icon: Wallet, sub: "UPI / Wallet" },
];

export function MockUpiCheckout({ orderId, amount, method, onSuccess, onFailure }: Props) {
  const [processing, setProcessing] = useState<string | null>(null);

  const simulate = (app: string, outcome: "success" | "fail") => {
    setProcessing(app);
    // Simulate network + UPI app handoff delay
    setTimeout(() => {
      if (outcome === "success") onSuccess();
      else onFailure(`Payment was cancelled in ${app}.`);
    }, 1400);
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !processing) onFailure("Payment cancelled by user."); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Razorpay Checkout <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-600">Test mode</span></DialogTitle>
          <DialogDescription>
            Order #{orderId.slice(0, 8).toUpperCase()} • Pay <span className="font-semibold text-foreground">{formatINR(amount)}</span>
          </DialogDescription>
        </DialogHeader>

        {method === "card" ? (
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted"><CreditCard className="h-5 w-5" /></div>
              <div>
                <p className="text-sm font-semibold">Test card</p>
                <p className="text-xs text-muted-foreground">4111 1111 1111 1111 • 12/34 • CVV 123</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              <Button onClick={() => simulate("card", "success")} disabled={!!processing} className="h-11 rounded-full bg-accent text-accent-foreground hover:opacity-90">
                {processing === "card" ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</> : `Pay ${formatINR(amount)}`}
              </Button>
              <Button variant="outline" onClick={() => simulate("card", "fail")} disabled={!!processing} className="h-10 rounded-full">
                Simulate failure
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Choose a UPI app to continue (mocked — no real payment will happen).</p>
            {UPI_APPS.map((app) => {
              const Icon = app.icon;
              const isProcessing = processing === app.id;
              return (
                <button
                  key={app.id}
                  disabled={!!processing}
                  onClick={() => simulate(app.id, "success")}
                  className="flex w-full items-center gap-3 rounded-xl border-2 border-border p-4 text-left transition-base hover:border-accent disabled:opacity-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted"><Icon className="h-5 w-5" /></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{app.label}</p>
                    <p className="text-xs text-muted-foreground">{app.sub}</p>
                  </div>
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin text-accent" /> : <span className="text-xs text-accent">Pay →</span>}
                </button>
              );
            })}
            <Button variant="outline" onClick={() => simulate("upi", "fail")} disabled={!!processing} className="mt-2 h-10 w-full rounded-full">
              Simulate failure
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}