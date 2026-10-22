// Tiny app-wide event bus (toasts, typing indicator, partner messages, clock ticks).
type Handler = (payload: any) => void;
const handlers = new Map<string, Set<Handler>>();
export function on(evt: string, h: Handler) {
  if (!handlers.has(evt)) handlers.set(evt, new Set());
  handlers.get(evt)!.add(h);
  return () => { handlers.get(evt)?.delete(h); };
}
export function emit(evt: string, payload?: unknown) { handlers.get(evt)?.forEach((h) => h(payload)); }

export type ToastKind = 'success' | 'error' | 'info' | 'coin' | 'love';
export function toast(text: string, kind: ToastKind = 'info') { emit('toast', { text, kind, id: Math.random() }); }
