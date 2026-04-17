// MarketPrime AI chat — streams responses from Lovable AI Gateway.
// Builds a system prompt that includes the current page context the user is on.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PageCtx {
  kind: string;
  [k: string]: unknown;
}

function buildSystemPrompt(ctx: {
  page?: PageCtx;
  cart?: { itemCount: number; items: Array<{ title: string; qty: number; price: number }> };
  isLoggedIn?: boolean;
}) {
  const lines: string[] = [
    "You are Prime, the friendly AI shopping assistant for MarketPrime — a premium e-commerce store.",
    "Be concise (2-4 sentences usually), warm, and helpful. Use plain text, no markdown lists unless asked.",
    "Currency is INR (₹). Always speak as if the user is in India.",
    "If asked about something you cannot do (e.g. apply a coupon, change an order), explain politely and suggest the right page.",
  ];

  if (ctx.isLoggedIn === false) {
    lines.push("The user is NOT signed in. If they ask about orders or account, gently suggest signing in first.");
  } else {
    lines.push("The user is signed in.");
  }

  const p = ctx.page;
  if (p?.kind === "product") {
    lines.push(
      `The user is currently viewing a product:
- Title: ${p.title}
- Brand: ${p.brand}
- Category: ${p.category}
- Price: ₹${p.price}
- Stock: ${p.stock} units ${Number(p.stock) > 0 ? "(in stock)" : "(out of stock)"}.
Answer questions about this product specifically when relevant.`
    );
  } else if (p?.kind === "cart") {
    lines.push(`The user is on the Cart page with ${p.itemCount} items, subtotal ₹${p.subtotal}.`);
  } else if (p?.kind === "order") {
    lines.push(`The user is viewing order ${p.orderId}, status: ${p.status}, total ₹${p.total}.`);
  } else if (p?.kind === "home") {
    lines.push("The user is on the home page.");
  }

  if (ctx.cart && ctx.cart.itemCount > 0) {
    const items = ctx.cart.items
      .map((i) => `${i.qty}x ${i.title} (₹${i.price})`)
      .join("; ");
    lines.push(`Their cart has ${ctx.cart.itemCount} items: ${items}.`);
  }

  return lines.join("\n");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = buildSystemPrompt(context ?? {});

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: system }, ...messages],
        stream: true,
      }),
    });

    if (upstream.status === 429 || upstream.status === 402) {
      return new Response(JSON.stringify({ error: upstream.status === 429 ? "rate_limited" : "payment_required" }), {
        status: upstream.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!upstream.ok) {
      const t = await upstream.text();
      console.error("AI gateway error:", upstream.status, t);
      return new Response(JSON.stringify({ error: "ai_error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(upstream.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
