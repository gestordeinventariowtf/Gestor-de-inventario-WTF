export class OutboxQueue {
  constructor(store, { batchSize = 25 } = {}) {
    this.store = store;
    this.batchSize = batchSize;
  }

  async pendingBatch() {
    const data = await this.store.read();
    return (Array.isArray(data.outbox) ? data.outbox : [])
      .filter((event) => event.status === "pending" || event.status === "retry")
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
      .slice(0, this.batchSize);
  }

  async markSent(eventIds, { remoteAckAt = new Date().toISOString() } = {}) {
    const ids = new Set(eventIds);
    const data = await this.store.read();
    const outbox = (Array.isArray(data.outbox) ? data.outbox : []).map((event) => {
      if (!ids.has(event.eventId)) return event;
      return Object.assign({}, event, { status: "sent", remoteAckAt });
    });
    await this.store.write(Object.assign({}, data, { outbox }));
    return outbox;
  }

  async markFailed(eventIds, errorMessage) {
    const ids = new Set(eventIds);
    const data = await this.store.read();
    const outbox = (Array.isArray(data.outbox) ? data.outbox : []).map((event) => {
      if (!ids.has(event.eventId)) return event;
      return Object.assign({}, event, {
        status: "retry",
        attempts: Number(event.attempts || 0) + 1,
        lastError: String(errorMessage || "Error desconocido"),
        nextRetryAt: new Date(Date.now() + 30000).toISOString()
      });
    });
    await this.store.write(Object.assign({}, data, { outbox }));
    return outbox;
  }

  async drain(syncAdapter) {
    const batch = await this.pendingBatch();
    if (batch.length === 0) return { sent: 0, failed: 0 };
    try {
      await syncAdapter.sendBatch(batch);
      await this.markSent(batch.map((event) => event.eventId));
      return { sent: batch.length, failed: 0 };
    } catch (error) {
      await this.markFailed(batch.map((event) => event.eventId), error.message);
      return { sent: 0, failed: batch.length, error: error.message };
    }
  }
}
