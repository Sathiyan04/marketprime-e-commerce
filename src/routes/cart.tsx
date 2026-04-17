import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "@/stores/cart";
import { useChatContext } from "@/stores/chat-context";
import { formatINR } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Your cart — MarketPrime" }] }),
  component: CartPage,
});

function CartPage() {
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const subtotal = useCart((s) => s.items.reduce((a, i) => a + i.price * i.quantity, 0));
  const setPage = useChatContext((s) => s.setPage);

  const itemCount = items.reduce((a, i) => a + i.quantity, 0);
  const shipping = subtotal > 999 || subtotal === 0 ? 0 : 49;
  const total = subtotal + shipping;

  useEffect(() => {
    setPage({ kind: "cart", itemCount, subtotal });
  }, [itemCount, subtotal, setPage]);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <ShoppingBag className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-sm text-muted-foreground">Browse our catalog and find something you love.</p>
        <Link to="/" className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-base hover:opacity-90">
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="font-display text-2xl font-bold">Your cart ({itemCount} items)</h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <ul className="space-y-4">
          {items.map((i) => (
            <li key={i.productId} className="flex gap-4 rounded-xl border bg-card p-4">
              <Link to="/products/$slug" params={{ slug: i.slug }} className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                <img src={i.imageUrl} alt={i.title} className="h-full w-full object-cover" />
              </Link>
              <div className="flex flex-1 flex-col">
                <Link to="/products/$slug" params={{ slug: i.slug }} className="line-clamp-2 text-sm font-medium hover:text-accent">
                  {i.title}
                </Link>
                <p className="mt-1 font-display text-base font-semibold">{formatINR(i.price)}</p>
                <div className="mt-auto flex items-center justify-between">
                  <div className="inline-flex items-center rounded-full border">
                    <button onClick={() => setQty(i.productId, i.quantity - 1)} className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold tabular-nums">{i.quantity}</span>
                    <button onClick={() => setQty(i.productId, i.quantity + 1)} className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button onClick={() => remove(i.productId)} className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-base hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-xl border bg-card p-6 shadow-soft">
          <h2 className="font-display text-lg font-bold">Order summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Subtotal" value={formatINR(subtotal)} />
            <Row label="Shipping" value={shipping === 0 ? <span className="text-success">Free</span> : formatINR(shipping)} />
            <div className="my-3 border-t" />
            <Row label={<span className="font-semibold">Total</span>} value={<span className="font-display text-lg font-bold">{formatINR(total)}</span>} />
          </dl>
          <Link to="/checkout" className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-sm font-semibold text-accent-foreground shadow-glow transition-base hover:opacity-90">
            Checkout <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-3 text-center text-xs text-muted-foreground">Secure checkout • 7-day returns</p>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <dt>{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}
