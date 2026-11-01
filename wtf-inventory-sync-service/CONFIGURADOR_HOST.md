# Configurador WTF ICG Host

El instalador es reutilizable. No contiene una base de datos ni queda vinculado a ninguna base antes de que el instalador la reciba explícitamente.

## Primera instalación

1. Ejecuta `WTF-ICG-Host-Configurable-DBFREST.exe` como administrador.
2. Completa la activación técnica de un solo uso.
3. Cuando el instalador lo solicite, escribe el nombre exacto de la base SQL y la carpeta de datos.
   - Pruebas: puedes escribir `DBFREST`.
   - Computadora del negocio: puedes escribir `FRS_WTFOODVZL`.
   - No existe un nombre preseleccionado: si se deja vacío, la instalación se detiene.
4. El Host se instalará y conservará el gateway técnico actual.

## Cambios posteriores

Abre `WTF ICG Host Configurador.exe` en la carpeta de instalación. La herramienta permite cambiar:

- base de datos SQL;
- carpeta de datos SQL Server;
- Web.App y proyecto Firebase;
- gateway técnico;
- Terminal ID;
- credencial técnica;
- clave local del panel;
- modo automático o manual.

Antes de guardar crea una copia del `.env`, detiene únicamente la instancia instalada del Host y reinicia el servicio con la nueva configuración. La credencial técnica no se guarda en texto plano: se protege con DPAPI de Windows.

## Modo manual

En modo `manual` se detiene la revisión programada. El panel local conserva el botón **Sincronizar**, que ejecuta la misma operación idempotente bajo demanda. Un fallo no elimina la cola local.

En modo `automatico` se conserva el comportamiento actual y la revisión programada continúa activa.

El configurador no cambia Firebase Auth, no modifica reglas remotas y no sube la contraseña de activación a Firestore.
