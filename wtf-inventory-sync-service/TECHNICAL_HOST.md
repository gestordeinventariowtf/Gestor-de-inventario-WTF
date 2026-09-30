# Identidad tecnica del WTF ICG Host

El Host puede operar sin iniciar sesion con una cuenta humana. En modo `technical`, cada instalacion usa `terminalId` y una credencial derivada durante el enrolamiento. Cada solicitud se firma con HMAC-SHA256 y contiene timestamp y nonce de un solo uso.

## Configuracion del backend

Configura en Firebase Functions el secreto `WTF_HOST_SYNC_SECRET`. Nunca lo guardes en GitHub, en Firestore ni dentro del instalador. La funcion `wtfEnrollHostTerminal` entrega la credencial una sola vez a uno de los administradores raiz autenticados.

## Configuracion del Host

```env
WTF_HOST_IDENTITY_MODE=technical
WTF_HOST_SYNC_ENDPOINT=https://us-central1-gestor-de-inventario-wtf-29056.cloudfunctions.net/wtfHostFirestoreGateway
WTF_TERMINAL_ID=term_...
WTF_TERMINAL_SECRET_PROTECTED=<salida-de-ConvertFrom-SecureString>
```

El valor protegido debe generarse y consumirse en la misma cuenta de Windows que ejecuta el Host. El Host nunca escribe la credencial en los logs. Para desarrollo local se admite temporalmente `WTF_TERMINAL_SECRET`, pero no debe incluirse en un instalador ni en Git.

## Alcance del gateway

El gateway solo permite `GET` y `PATCH` sobre el estado WTF, sus shards, `icgControl` y el ledger `icgAppliedMovements`. No es un proxy Firestore arbitrario. Las reglas de Firestore permanecen cerradas para las terminales; el acceso se realiza únicamente con Admin SDK dentro de la función.

## Revocacion y rotacion

Revocar la terminal desde la administracion de terminales cambia su estado a `revoked`; el siguiente intento del Host queda rechazado. Para rotar la credencial se usa `wtfEnrollHostTerminal` con `rotate: true` y se instala el nuevo valor protegido en esa misma terminal.

