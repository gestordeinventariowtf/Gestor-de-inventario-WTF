export class VirtualKdsAdapter {
  constructor({ ack = true } = {}) {
    this.ack = ack;
    this.received = [];
  }

  async sendCommand(command) {
    if (this.received.some((row) => row.commandId === command.commandId)) {
      return {
        status: "ack",
        duplicate: true,
        commandId: command.commandId,
        ackedAt: new Date().toISOString()
      };
    }

    this.received.push(command);
    if (!this.ack) throw new Error("ACK_TIMEOUT");

    return {
      status: "ack",
      duplicate: false,
      commandId: command.commandId,
      ackedAt: new Date().toISOString()
    };
  }
}
