import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useChatContext } from "@/stores/chat-context";
import { formatINR, formatDate } from "@/lib/format";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/orders/$id")({
  head: () => ({ meta: [{ title: "Order details — MarketPrime" }] }),
  component: OrderDetailPage,
});

const STAGES = ["ordered", "packed", "shipped", "out_for_delivery", "delivered"] as const;
const STAGE_LABEL: Record<string, string> = {
  ordered: "Ordered", packed: "Packed", shipped: "Shipped",
  out_for_delivery: "Out for delivery", delivered: "Delivered",
};
const CANCEL_REASONS = [
  "Changed my mind",
  "Wrong address",
  "Found better price",
  "Ordered by mistake",
  "Delivery taking too long",
  "Other",
];

function OrderDetailPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const setPage = useChatContext((s) => s.setPage);

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);
  useEffect(() => { setPage({ kind: "other", description: "order detail page" }); }, [setPage]);

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders").select("*, order_items(*)")
        .eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const cancelMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelled", cancellation_reason: reason })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Order cancelled. Items restocked; refund logged if prepaid.");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["order", id] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not cancel order"),
  });

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8 space-y-4">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-muted-foreground">Order not found.</p>
        <Link to="/orders" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">Back to orders</Link>
      </div>
    );
  }

  const cancelled = order.status === "cancelled";
  const delivered = order.status === "delivered";
  const canCancel = !cancelled && !delivered;
  const stageIdx = STAGES.indexOf(order.status as any);
  const addr = order.shipping_address as any;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link to="/orders" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All orders
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Order #{order.id.slice(0, 8).toUpperCase()}</h1>
          <p className="text-sm text-muted-foreground">Placed on {formatDate(order.created_at)}</p>
        </div>
        {cancelled && (
          <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">Cancelled</span>
        )}
      </div>

      {/* Timeline */}
      {!cancelled && (
        <div className="mt-6 rounded-xl border bg-card p-5 shadow-soft">
          <p className="mb-4 text-sm font-semibold">Tracking</p>
          <div className="flex items-center justify-between">
            {STAGES.map((s, i) => {
              const done = i <= stageIdx;
              return (
                <div key={s} className="flex flex-1 flex-col items-center">
                  <div className="flex w-full items-center">
                    {i > 0 && <div className={`h-0.5 flex-1 ${i <= stageIdx ? "bg-accent" : "bg-border"}`} />}
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${done ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
                      {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </div>
                    {i < STAGES.length - 1 && <div className={`h-0.5 flex-1 ${i < stageIdx ? "bg-accent" : "bg-border"}`} />}
                  </div>
                  <span className={`mt-1.5 text-center text-[10px] ${done ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                    {STAGE_LABEL[s]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="mt-5 rounded-xl border bg-card p-5 shadow-soft">
        <p className="mb-3 text-sm font-semibold">Items ({order.order_items.length})</p>
        <ul className="space-y-3">
          {order.order_items.map((it: any) => (
            <li key={it.id} className="flex items-center gap-3">
              <img src={it.image_url} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover" />
              <div className="flex-1">
                <p className="line-clamp-1 text-sm font-medium">{it.title}</p>
                <p className="text-xs text-muted-foreground">Qty {it.quantity} • {formatINR(Number(it.price))}</p>
              </div>
              <p className="text-sm font-semibold">{formatINR(Number(it.price) * it.quantity)}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* Address + Payment + Summary */}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-soft">
          <p className="mb-2 text-sm font-semibold">Shipping address</p>
          <p className="text-sm">{addr?.full_name}</p>
          <p className="text-xs text-muted-foreground">{addr?.line1}{addr?.line2 ? `, ${addr.line2}` : ""}</p>
          <p className="text-xs text-muted-foreground">{addr?.city}, {addr?.state} {addr?.postal_code}</p>
          <p className="text-xs text-muted-foreground">{addr?.phone}</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-soft">
          <p className="mb-2 text-sm font-semibold">Payment & totals</p>
          <p className="text-xs text-muted-foreground">Method: <span className="font-medium text-foreground uppercase">{order.payment_method}</span></p>
          <div className="mt-3 space-y-1 text-sm">
            <Row label="Subtotal" value={formatINR(Number(order.subtotal))} />
            {Number(order.discount) > 0 && <Row label="Discount" value={`- ${formatINR(Number(order.discount))}`} />}
            <Row label="Shipping" value={Number(order.shipping) === 0 ? "Free" : formatINR(Number(order.shipping))} />
            <div className="mt-2 flex justify-between border-t pt-2 font-bold">
              <span>Total</span><span>{formatINR(Number(order.total))}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel action */}
      <div className="mt-6">
        {canCancel ? (
          <Button variant="destructive" onClick={() => setOpen(true)} className="rounded-full">
            <X className="mr-1.5 h-4 w-4" /> Cancel order
          </Button>
        ) : delivered ? (
          <p className="text-sm text-muted-foreground">
            This order has been delivered. Need help? <a href="mailto:support@marketprime.app" className="font-medium text-primary hover:underline">Contact support</a>.
          </p>
        ) : cancelled && order.cancellation_reason ? (
          <p className="text-sm text-muted-foreground">Cancellation reason: <span className="font-medium text-foreground">{order.cancellation_reason}</span></p>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this order?</DialogTitle>
            <DialogDescription>
              Items will be restocked. {order.payment_method?.toLowerCase() !== "cod" && "A refund request will be created automatically."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason for cancellation</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue placeholder="Select a reason" /></SelectTrigger>
              <SelectContent>
                {CANCEL_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={cancelMut.isPending}>Keep order</Button>
            <Button
              variant="destructive"
              disabled={!reason || cancelMut.isPending}
              onClick={() => cancelMut.mutate()}
            >
              {cancelMut.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Confirm cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span><span className="text-foreground">{value}</span>
    </div>
  );
}
