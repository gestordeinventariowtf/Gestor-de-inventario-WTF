import { dispatchCommandEvent, markCommandAcked, markCommandRetry } from "../domain/kds-command.js";

export class KdsCommandQueue {
  constructor(store, { maxAttempts = 5 } = {}) {
    this.store = store;
    this.maxAttempts = maxAttempts;
  }

  async enqueue(command, event) {
    return this.store.upsertKdsCommandWithEvent(command, event);
  }

  async pendingCommands() {
    const data = await this.store.read();
    return (Array.isArray(data.kdsCommands) ? data.kdsCommands : [])
      .filter((command) => ["queued", "retry"].includes(command.status) && Number(command.attempts || 0) < this.maxAttempts)
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  }

  async dispatchNext(kdsAdapter, { now = new Date() } = {}) {
    const pending = await this.pendingCommands();
    if (pending.length === 0) return { sent: 0, acked: 0, failed: 0 };

    const command = pending[0];
    try {
      const ack = await kdsAdapter.sendCommand(command);
      if (!ack || ack.status !== "ack") throw new Error("ACK_TIMEOUT");

      const acked = markCommandAcked(command, { ackedAt: ack.ackedAt || now.toISOString() });
      await this.store.upsertKdsCommandWithEvent(acked, dispatchCommandEvent(acked, { now }));
      return { sent: 1, acked: 1, failed: 0, commandId: command.commandId };
    } catch (error) {
      const retry = markCommandRetry(command, error.message, { now });
      await this.store.upsertKdsCommandWithEvent(retry, dispatchCommandEvent(retry, { now }));
      return { sent: 1, acked: 0, failed: 1, commandId: command.commandId, error: error.message };
    }
  }

  async dispatchAll(kdsAdapter, { now = new Date() } = {}) {
    let sent = 0;
    let acked = 0;
    let failed = 0;
    let result = await this.dispatchNext(kdsAdapter, { now });

    while (result.sent > 0) {
      sent += result.sent;
      acked += result.acked;
      failed += result.failed;
      result = await this.dispatchNext(kdsAdapter, { now });
    }

    return { sent, acked, failed };
  }
}
