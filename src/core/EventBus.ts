type Handler<T> = (payload: T) => void;

export class EventBus<E extends Record<string, unknown>> {
  private handlers = new Map<keyof E, Set<Handler<never>>>();

  on<K extends keyof E>(key: K, handler: Handler<E[K]>): () => void {
    if (!this.handlers.has(key)) this.handlers.set(key, new Set());
    this.handlers.get(key)!.add(handler as Handler<never>);
    return () => this.off(key, handler);
  }

  off<K extends keyof E>(key: K, handler: Handler<E[K]>): void {
    this.handlers.get(key)?.delete(handler as Handler<never>);
  }

  emit<K extends keyof E>(key: K, payload: E[K]): void {
    for (const h of [...(this.handlers.get(key) ?? [])]) (h as Handler<E[K]>)(payload);
  }
}
