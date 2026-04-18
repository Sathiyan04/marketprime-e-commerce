import { Link, useNavigate } from "@tanstack/react-router";
import { Star, ShoppingCart } from "lucide-react";
import { formatINR, discountPct } from "@/lib/format";
import { useCart } from "@/stores/cart";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ProductCardData {
  id: string;
  slug: string;
  title: string;
  brand: string;
  price: number;
  original_price: number | null;
  rating: number;
  rating_count: number;
  image_url: string;
}

export function ProductCard({ p }: { p: ProductCardData }) {
  const off = discountPct(p.price, p.original_price);
  const add = useCart((s) => s.add);
  const { user } = useAuth();
  const navigate = useNavigate();

  const onQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate({ to: "/login", search: { redirect: "/cart", addProduct: p.id } });
      return;
    }
    add({ productId: p.id, slug: p.slug, title: p.title, price: p.price, imageUrl: p.image_url });
    toast.success(`${p.title} added to cart`);
  };

  return (
    <Link
      to="/products/$slug"
      params={{ slug: p.slug }}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-smooth hover:-translate-y-0.5 hover:shadow-elevated"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={p.image_url}
          alt={p.title}
          loading="lazy"
          className="h-full w-full object-cover transition-smooth group-hover:scale-105"
        />
        {off > 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground shadow-soft">
            {off}% OFF
          </span>
        )}
        <button
          onClick={onQuickAdd}
          aria-label={`Add ${p.title} to cart`}
          className="absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-elevated transition-base group-hover:opacity-100 hover:scale-110 focus:opacity-100"
        >
          <ShoppingCart className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {p.brand}
        </p>
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">{p.title}</h3>
        <div className="mt-1 flex items-center gap-1.5">
          <div className="flex items-center gap-0.5 rounded bg-success/10 px-1.5 py-0.5 text-[11px] font-semibold text-success">
            {p.rating.toFixed(1)} <Star className="h-2.5 w-2.5 fill-current" />
          </div>
          <span className="text-[11px] text-muted-foreground">({p.rating_count.toLocaleString("en-IN")})</span>
        </div>
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="font-display text-base font-semibold">{formatINR(p.price)}</span>
          {p.original_price && p.original_price > p.price && (
            <span className="text-xs text-muted-foreground line-through">
              {formatINR(p.original_price)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card">
      <div className="aspect-square animate-pulse bg-muted" />
      <div className="flex flex-col gap-2 p-4">
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-5 w-1/2 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
