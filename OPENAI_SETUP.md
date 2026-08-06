# Activar OpenAI / ChatGPT en WTF Sistema

La web nunca debe guardar la clave de OpenAI en `index.html` ni en `firebase-config.js`.
La clave debe vivir solo en Firebase Functions como variable de entorno.

## 1. Configurar la clave en Firebase Functions

Desde la carpeta raiz del proyecto:

```powershell
firebase functions:secrets:set OPENAI_API_KEY
```

Cuando lo pida, pega tu clave de OpenAI.

## 2. Activar el endpoint en la web

Cuando la funcion este desplegada, actualiza `firebase-config.js`:

```js
ai: {
  enabled: true,
  endpoint: "https://us-central1-gestor-de-inventario-wtf-29056.cloudfunctions.net/wtfAiAssistant",
  model: "gpt-5.5"
}
```

## 3. Desplegar

```powershell
firebase deploy --only functions,hosting
```

## Seguridad operativa

- La IA debe recomendar y auditar; no debe modificar inventario automaticamente sin revision.
- Para recuentos por foto, primero revisar las diferencias antes de aplicar ajustes.
- Para vinculos ICG, validar el producto sugerido antes de guardar el enlace.
- Para mermas, tratar las alertas como investigacion, no como conclusion definitiva.
