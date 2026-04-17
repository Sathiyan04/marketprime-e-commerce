import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Search, ShoppingCart, MapPin, User, LogOut, Package, Home } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/stores/cart";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, type FormEvent } from "react";

export function Header() {
  const { user, signOut } = useAuth();
  const cartCount = useCart((s) => s.items.reduce((a, i) => a + i.quantity, 0));
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    navigate({ to: "/search", search: { q } });
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-accent shadow-glow">
            <span className="font-display text-lg font-bold text-accent-foreground">M</span>
          </div>
          <span className="hidden font-display text-lg font-semibold tracking-tight sm:inline">
            MarketPrime
          </span>
        </Link>

        {/* Location */}
        <button className="hidden items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-base hover:bg-muted md:flex">
          <MapPin className="h-4 w-4" />
          <span className="text-xs leading-tight">
            <span className="block text-[10px]">Deliver to</span>
            <span className="block font-medium text-foreground">Mumbai 400001</span>
          </span>
        </button>

        {/* Search */}
        <form onSubmit={onSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search MarketPrime"
            className="h-10 w-full rounded-full border border-border bg-surface pl-10 pr-4 text-sm outline-none transition-base placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </form>

        {/* Account */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="hidden gap-1.5 sm:flex">
              <User className="h-4 w-4" />
              <span className="hidden text-sm font-medium md:inline">
                {user ? "Account" : "Sign in"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {user ? (
              <>
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  Hello, {user.email?.split("@")[0]}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/account"><User className="mr-2 h-4 w-4" />My Account</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/orders"><Package className="mr-2 h-4 w-4" />My Orders</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />Sign out
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem asChild><Link to="/login">Sign in</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/signup">Create account</Link></DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Cart */}
        <Link
          to="/cart"
          className="relative inline-flex h-10 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-base hover:bg-muted"
        >
          <ShoppingCart className="h-5 w-5" />
          <span className="hidden sm:inline">Cart</span>
          {cartCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground shadow-glow animate-float-up">
              {cartCount}
            </span>
          )}
        </Link>
      </div>

      {/* Categories strip */}
      <div className="border-t bg-surface-elevated">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 py-1.5 scrollbar-hide sm:px-6">
          <CategoryLink to="/">Home</CategoryLink>
          <CategoryLink to="/search" search={{ category: "Electronics" }}>Electronics</CategoryLink>
          <CategoryLink to="/search" search={{ category: "Fashion" }}>Fashion</CategoryLink>
          <CategoryLink to="/search" search={{ category: "Home" }}>Home & Living</CategoryLink>
          <CategoryLink to="/search" search={{ category: "Books" }}>Books</CategoryLink>
          <CategoryLink to="/orders">My Orders</CategoryLink>
        </div>
      </div>
    </header>
  );
}

function CategoryLink({
  to,
  search,
  children,
}: {
  to: string;
  search?: Record<string, string>;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      search={search as never}
      className="shrink-0 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-base hover:bg-muted hover:text-foreground"
    >
      {children}
    </Link>
  );
}
