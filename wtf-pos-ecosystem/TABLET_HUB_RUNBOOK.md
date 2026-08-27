# WTF POS - Guia de tablets APK y hub local

Esta guia aplica al piloto interno con las APK demo de POS, KDS y CDS. No activa produccion real.

## Preparar el hub

1. Conectar la PC hub y las tablets a la misma red local.
2. En la PC hub ejecutar:

```bash
npm run hub
```

3. Abrir la pantalla del hub en la PC.
4. Confirmar que aparezcan:
   - codigo corto;
   - QR de emparejamiento;
   - URL local;
   - URLs LAN detectadas.

## Instalar APK demo

Instalar una APK por funcion:

- WTF POS Local: caja o toma de orden.
- WTF KDS: cocina.
- WTF CDS: pantalla cliente.

Cada tablet debe tener un nombre claro, por ejemplo:

- POS Caja principal.
- KDS Cocina caliente.
- CDS Mostrador.

## Emparejar tablet

1. Abrir la APK.
2. Usar Escanear QR o pegar el dato `wtfpos://pair?...`.
3. Pulsar Aplicar emparejamiento.
4. Completar nombre y estacion.
5. Guardar equipo.

## Verificar heartbeat

En la pantalla del hub, el equipo debe aparecer como:

- `online`: correcto.
- `warning`: revisar red o app en segundo plano.
- `offline`: no usar para piloto hasta reconectar.

## Prueba POS -> KDS -> CDS

1. En POS agregar un producto.
2. Enviar KDS.
3. Confirmar que KDS recibe la comanda.
4. Confirmar que CDS muestra carrito y total.
5. Cobrar venta demo.
6. Confirmar que CDS se limpia.
7. Revisar monitor del hub.

## Registrar validacion por dispositivo

Usar el endpoint del hub:

```bash
POST /api/pilot/device-reports
```

Ejemplo:

```json
{
  "deviceId": "tablet-pos-1",
  "role": "POS",
  "name": "POS Caja principal",
  "station": "Caja",
  "status": "passed",
  "notes": "Emparejo, envio heartbeat y completo venta demo."
}
```

Estados permitidos:

- `passed`
- `warning`
- `failed`

## Criterio de aprobacion

Una tablet queda lista para piloto si:

- aparece online en el hub;
- mantiene heartbeat;
- registra validacion `passed`;
- cumple su flujo: POS vende, KDS recibe o CDS muestra.

## Criterio de rechazo

No usar una tablet si:

- aparece offline;
- no puede emparejarse;
- no mantiene heartbeat;
- la APK se cierra durante el flujo;
- el hub no registra su validacion.
