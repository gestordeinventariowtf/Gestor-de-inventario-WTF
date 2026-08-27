# Project Inventory - WTF POS Ecosystem

## Repositorio actual

Ruta base:

`E:\COPIA DEL WTF SISTEMA CON ICG\WTF_SISTEMA ICG INCLUIDO`

## Componentes existentes

### Web.App principal

- Archivo principal: `index.html`
- Tamano aproximado: 21,351 lineas.
- Contiene la mayor parte de la logica actual de WTF Sistema:
  - inventario cocina;
  - cuarto frio cocina;
  - inventario bar;
  - cuarto frio bar;
  - mise an place;
  - produccion;
  - ICG FrontRest;
  - finanzas;
  - recursos humanos;
  - activos operativos;
  - usuarios y permisos;
  - IA/notificaciones/PWA.

### Firebase

- `firebase.json`
- `firestore.rules`
- `storage.rules`
- `database.rules.json`
- Hosting site: `gestor-de-inventario-wtf-prod-2026`
- Proyecto default: `gestor-de-inventario-wtf-29056`
- Hosting publica desde la raiz.
- Archivos `.md`, `functions`, `android-app`, `wtf-inventory-sync-service`, backups y herramientas estan excluidos del hosting.

### Firebase Functions

- Carpeta: `functions`
- Runtime declarado: Node 22.
- Dependencias principales:
  - `firebase-admin`
  - `firebase-functions`
  - `web-push`
- Archivo principal: `functions/index.js`

### Android actual

- Carpeta: `android-app`
- Tecnologia: Capacitor Android.
- App actual: contenedor WebView para `https://gestor-de-inventario-wtf-prod-2026.web.app`
- App id: `com.wtf.gestion`
- No es todavia WTF POS nativo.

### Servicio local ICG Host

- Carpeta: `wtf-inventory-sync-service`
- Tecnologia: TypeScript/Node.
- Objetivo actual: sincronizacion/lectura de ICG FrontRest local hacia WTF Sistema.
- Scripts:
  - `build`
  - `dev`
  - `check`
  - `package:win`
- Adaptadores existentes:
  - `icg-backup-sync-adapter`
  - `icg-export-adapter`
  - `icg-file-adapter`
  - `web-api-adapter`

### Sharp de Limpieza independiente

- Carpeta: `sharp-limpieza`
- Contiene `index.html`, `script.js`, `styles.css`.

### Assets

- Logo WTF.
- Piezas de uniformes.
- Plantillas visuales.

## Prompt maestro consolidado

Archivo consolidado local:

`WTF_POS_ECOSYSTEM_PROMPT_MAESTRO_CONSOLIDADO.md`

Contiene 35 partes acumuladas y aproximadamente:

- 21,680 lineas.
- 76,883 palabras.
- 524,600 caracteres.

## Estado de implementacion POS

No existe todavia una implementacion productiva de WTF POS, WTF KDS o WTF CDS separada.

El Android existente es una app WebView de la Web.App actual y no debe confundirse con WTF POS.

## Riesgo principal detectado

El sistema actual concentra mucha logica en `index.html`. Integrar POS directamente ahi aumentaria riesgo de regresiones. Se recomienda crear el POS como paquete/proyecto separado y conectar por contratos estables.
