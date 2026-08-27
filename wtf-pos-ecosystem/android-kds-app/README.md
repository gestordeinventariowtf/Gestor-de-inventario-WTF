# WTF KDS Android

APK demo aislada para pantalla de cocina.

Esta app no toca Firebase, ICG ni inventario real. Usa almacenamiento local del dispositivo para validar:

- cola de comandas;
- ACK local;
- reintentos;
- estados recibido, preparando, listo y entregado;
- auditoria local.
- sincronizacion con WTF POS Local Hub.

## Comandos

```powershell
npm install
npm run check
npm run build:android
```

APK debug:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Prueba con POS

Abre el hub en la PC:

```text
http://127.0.0.1:8790
```

Luego usa `Escanear QR` en la app o pega el dato de emparejamiento. Tambien puedes configurar la misma URL del hub local que usa POS, por ejemplo:

```text
http://192.168.1.10:8790
```

La app sincroniza automaticamente cada 5 segundos.
