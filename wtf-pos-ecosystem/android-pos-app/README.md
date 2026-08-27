# WTF POS Local Android

APK demo aislada del ecosistema WTF POS.

Esta app no toca Firebase, ICG ni inventario real. Usa almacenamiento local del dispositivo para validar:

- venta local;
- mesas;
- carrito;
- KDS/CDS virtual;
- pago virtual;
- cierre Z;
- dividir/unir cuentas.
- comunicacion con WTF POS Local Hub.

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

## Prueba con KDS/CDS

1. En la PC de la red local ejecuta:

```powershell
cd wtf-pos-ecosystem
npm run hub
```

2. Abre el hub en el navegador de la PC:

```text
http://127.0.0.1:8790
```

3. En la app usa `Escanear QR` o pega el dato de emparejamiento que aparece en el hub.

Tambien puedes escribir la URL del hub manualmente, por ejemplo:

```text
http://192.168.1.10:8790
```

4. Pulsa `Probar conexion`.
