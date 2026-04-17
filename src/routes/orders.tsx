import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Package, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useChatContext } from "@/stores/chat-context";
import { formatINR, formatDate } from "@/lib/format";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "My orders — MarketPrime" }] }),
  component: OrdersPage,
});

const STAGES = ["ordered", "packed", "shipped", "out_for_delivery", "delivered"] as const;
const STAGE_LABEL: Record<string, string> = {
  ordered: "Ordered", packed: "Packed", shipped: "Shipped",
  out_for_delivery: "Out for delivery", delivered: "Delivered",
};

function OrdersPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const setPage = useChatContext((s) => s.setPage);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);
  useEffect(() => { setPage({ kind: "other", description: "orders page" }); }, [setPage]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!user) return null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="font-display text-2xl font-bold">My orders</h1>
      {isLoading ? (
        <p className="mt-8 text-center text-muted-foreground">Loading…</p>
      ) : orders.length === 0 ? (
        <div className="mt-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Package className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">No orders yet.</p>
          <Link to="/" className="mt-4 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90">Start shopping</Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-5">
          {orders.map((o: any) => <OrderCard key={o.id} o={o} />)}
        </ul>
      )}
    </div>
  );
}

function OrderCard({ o }: { o: any }) {
  const cancelled = o.status === "cancelled";
  const stageIdx = STAGES.indexOf(o.status as any);
  return (
    <li className="rounded-xl border bg-card p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Order #{o.id.slice(0, 8).toUpperCase()}</p>
          <p className="text-xs text-muted-foreground">Placed on {formatDate(o.created_at)}</p>
        </div>
        <p className="font-display text-lg font-bold">{formatINR(Number(o.total))}</p>
      </div>

      <ul className="mt-4 space-y-2">
        {o.order_items.map((it: any) => (
          <li key={it.id} className="flex items-center gap-3">
            <img src={it.image_url} alt="" className="h-12 w-12 shrink-0 rounded-md object-cover" />
            <div className="flex-1 text-sm">
              <p className="line-clamp-1 font-medium">{it.title}</p>
              <p className="text-xs text-muted-foreground">Qty {it.quantity} • {formatINR(Number(it.price))}</p>
            </div>
          </li>
        ))}
      </ul>

      {!cancelled ? (
        <div className="mt-5">
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
      ) : (
        <p className="mt-4 inline-block rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">Cancelled</p>
      )}
    </li>
  );
}
