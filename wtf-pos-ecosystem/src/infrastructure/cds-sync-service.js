import { clearCustomerDisplay, createCustomerDisplaySnapshot } from "../domain/cds-display.js";

export class CdsSyncService {
  constructor(store) {
    this.store = store;
  }

  async publishTicket(ticket, cdsAdapter, options = {}) {
    const { snapshot, event } = createCustomerDisplaySnapshot(ticket, options);
    await this.store.upsertCdsSnapshotWithEvent(snapshot, event);
    if (cdsAdapter) await cdsAdapter.showSnapshot(snapshot);
    return snapshot;
  }

  async clearTicket(ticket, cdsAdapter, options = {}) {
    const { snapshot, event } = clearCustomerDisplay(ticket, options);
    await this.store.upsertCdsSnapshotWithEvent(snapshot, event);
    if (cdsAdapter) await cdsAdapter.showSnapshot(snapshot);
    return snapshot;
  }
}
