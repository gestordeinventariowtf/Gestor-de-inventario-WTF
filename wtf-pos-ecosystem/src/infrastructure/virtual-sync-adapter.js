export class VirtualSyncAdapter {
  constructor({ shouldFail = false } = {}) {
    this.shouldFail = shouldFail;
    this.batches = [];
  }

  async sendBatch(events) {
    if (this.shouldFail) throw new Error("SYNC_UNAVAILABLE");
    this.batches.push(events.map((event) => event.eventId));
    return { ok: true, count: events.length };
  }
}
