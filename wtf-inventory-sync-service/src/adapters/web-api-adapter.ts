import type { SyncMovement } from "../core/types.js";

export class WebApiAdapter {
  constructor(private webAppUrl: string, private apiKey: string) {}

  async pushMovementPreview(movement: SyncMovement): Promise<void> {
    // Pendiente de activar cuando exista endpoint seguro en Firebase/Web App.
    // Esta funcion queda intencionalmente sin escritura remota para evitar cambios invisibles.
    void this.webAppUrl;
    void this.apiKey;
    void movement;
  }
}
