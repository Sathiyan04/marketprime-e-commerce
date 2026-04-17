import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { MapPin, Plus, Trash2, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Field } from "./login";
import { toast } from "sonner";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "My account — MarketPrime" }] }),
  component: AccountPage,
});

function AccountPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id], enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: addresses = [] } = useQuery({
    queryKey: ["addresses", user?.id], enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("addresses").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const [adding, setAdding] = useState(false);
  const [a, setA] = useState({ full_name: "", phone: "", line1: "", line2: "", city: "", state: "", postal_code: "", country: "India" });

  const addAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("addresses").insert({ ...a, user_id: user.id });
    if (error) { toast.error(error.message); return; }
    toast.success("Address added");
    setAdding(false);
    setA({ full_name: "", phone: "", line1: "", line2: "", city: "", state: "", postal_code: "", country: "India" });
    qc.invalidateQueries({ queryKey: ["addresses", user.id] });
  };

  const removeAddress = async (id: string) => {
    const { error } = await supabase.from("addresses").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["addresses", user!.id] });
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="font-display text-2xl font-bold">My account</h1>

      <section className="mt-6 rounded-xl border bg-card p-6 shadow-soft">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-accent text-accent-foreground">
            <User className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="font-display text-lg font-semibold">{profile?.full_name || "Welcome"}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <Button variant="outline" onClick={signOut} className="rounded-full">Sign out</Button>
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-lg font-bold">Saved addresses</h2>
          {!adding && (
            <Button onClick={() => setAdding(true)} className="rounded-full bg-accent text-accent-foreground hover:opacity-90">
              <Plus className="mr-1.5 h-4 w-4" /> Add
            </Button>
          )}
        </div>

        {adding && (
          <form onSubmit={addAddress} className="mt-4 rounded-xl border bg-card p-5 shadow-soft">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name" type="text" value={a.full_name} onChange={(v) => setA({ ...a, full_name: v })} required />
              <Field label="Phone" type="tel" value={a.phone} onChange={(v) => setA({ ...a, phone: v })} required />
              <div className="sm:col-span-2"><Field label="Address line 1" type="text" value={a.line1} onChange={(v) => setA({ ...a, line1: v })} required /></div>
              <Field label="City" type="text" value={a.city} onChange={(v) => setA({ ...a, city: v })} required />
              <Field label="State" type="text" value={a.state} onChange={(v) => setA({ ...a, state: v })} required />
              <Field label="Postal code" type="text" value={a.postal_code} onChange={(v) => setA({ ...a, postal_code: v })} required />
              <Field label="Country" type="text" value={a.country} onChange={(v) => setA({ ...a, country: v })} required />
            </div>
            <div className="mt-4 flex gap-2">
              <Button type="button" variant="outline" onClick={() => setAdding(false)} className="rounded-full">Cancel</Button>
              <Button type="submit" className="rounded-full bg-primary text-primary-foreground hover:opacity-90">Save address</Button>
            </div>
          </form>
        )}

        {addresses.length === 0 && !adding ? (
          <p className="mt-4 rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">No saved addresses yet.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {addresses.map((ad: any) => (
              <li key={ad.id} className="rounded-xl border bg-card p-4 shadow-soft">
                <div className="flex items-start justify-between gap-2">
                  <MapPin className="h-4 w-4 text-accent" />
                  <button onClick={() => removeAddress(ad.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-2 text-sm font-semibold">{ad.full_name}</p>
                <p className="text-xs text-muted-foreground">{ad.phone}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {ad.line1}{ad.line2 ? `, ${ad.line2}` : ""}, {ad.city}, {ad.state} {ad.postal_code}, {ad.country}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
