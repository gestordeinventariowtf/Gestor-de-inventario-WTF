export class BackendSyncAdapter {
  constructor(api) {
    this.api = api;
    this.responses = [];
  }

  async sendBatch(events) {
    const response = await this.api.receiveBatch(events);
    this.responses.push(response);
    return response;
  }
}
