"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebApiAdapter = void 0;
class WebApiAdapter {
    webAppUrl;
    apiKey;
    constructor(webAppUrl, apiKey) {
        this.webAppUrl = webAppUrl;
        this.apiKey = apiKey;
    }
    async pushMovementPreview(movement) {
        // Pendiente de activar cuando exista endpoint seguro en Firebase/Web App.
        // Esta funcion queda intencionalmente sin escritura remota para evitar cambios invisibles.
        void this.webAppUrl;
        void this.apiKey;
        void movement;
    }
}
exports.WebApiAdapter = WebApiAdapter;
