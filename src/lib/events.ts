// Simple event bus for in-app reactive updates (no external deps)
// Supports addListener, removeListener, emit, once.

export type AppEventMap = {
  "transactions:changed": { action: "create" | "update" | "delete"; id?: string };
  "accounts:balancesChanged": void;
  // reason: pequena descrição da origem (ex: "transaction change", "budget updated")
  "budgets:progressInvalidated": { reason?: string } | void;
};

type Listener<T> = (payload: T) => void;

class EventBus {
  // Usar armazenamento afim para simplificar tipagem (runtime safety manual)
  private listeners: Record<string, Set<Listener<any>>> = {};

  on<K extends keyof AppEventMap>(event: K, cb: Listener<AppEventMap[K]>): () => void {
    const key = event as string;
    if (!this.listeners[key]) this.listeners[key] = new Set();
    this.listeners[key].add(cb as any);
    return () => this.off(event, cb);
  }

  once<K extends keyof AppEventMap>(event: K, cb: Listener<AppEventMap[K]>): () => void {
    const wrapper: Listener<AppEventMap[K]> = (payload) => {
      this.off(event, wrapper);
      cb(payload);
    };
    return this.on(event, wrapper);
  }

  off<K extends keyof AppEventMap>(event: K, cb: Listener<AppEventMap[K]>) {
    const key = event as string;
    this.listeners[key]?.delete(cb as any);
  }

  emit<K extends keyof AppEventMap>(event: K, payload: AppEventMap[K]) {
    const key = event as string;
    this.listeners[key]?.forEach((cb) => {
      try {
        cb(payload);
      } catch (e) {
        console.warn("[EventBus] listener error for", event, e);
      }
    });
  }
}

export const Events = new EventBus();
