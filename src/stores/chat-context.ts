import { create } from "zustand";

/**
 * Lightweight context store the AI chatbot reads from.
 * Pages set their current "page context" so the bot can answer questions
 * like "is this in stock?" or "where is my order?".
 */
export type ChatPageContext =
  | { kind: "home" }
  | { kind: "product"; productId: string; title: string; price: number; stock: number; brand: string; category: string }
  | { kind: "cart"; itemCount: number; subtotal: number }
  | { kind: "order"; orderId: string; status: string; total: number }
  | { kind: "other"; description?: string };

interface ChatCtxState {
  page: ChatPageContext;
  setPage: (p: ChatPageContext) => void;
}

export const useChatContext = create<ChatCtxState>((set) => ({
  page: { kind: "home" },
  setPage: (p) => set({ page: p }),
}));
