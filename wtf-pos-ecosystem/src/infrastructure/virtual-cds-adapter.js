import { mergeCustomerDisplaySnapshot } from "../domain/cds-display.js";

export class VirtualCdsAdapter {
  constructor() {
    this.snapshots = new Map();
  }

  async showSnapshot(snapshot) {
    if (!snapshot || !snapshot.snapshotId) throw new Error("Snapshot CDS invalido.");
    const current = this.snapshots.get(snapshot.snapshotId);
    const merged = mergeCustomerDisplaySnapshot(current, snapshot);
    this.snapshots.set(snapshot.snapshotId, merged);
    return {
      status: "synced",
      snapshotId: merged.snapshotId,
      updatedAt: merged.updatedAt,
      ignoredStale: merged !== snapshot
    };
  }

  currentSnapshot(ticketId) {
    return this.snapshots.get(`cds_${ticketId}`) || null;
  }
}
