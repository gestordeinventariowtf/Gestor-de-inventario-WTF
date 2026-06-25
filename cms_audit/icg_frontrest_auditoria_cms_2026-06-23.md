# Auditoria ICG FrontRest CMS - 2026-06-23

## Resultado ejecutivo

Los 13 archivos `.CMS` fueron leidos correctamente como contenedores `zlib/deflate`. Al descomprimirlos aparece una base Microsoft Jet/Access antigua con firma `Standard Jet DB` desde el offset 21.

La lectura de filas reales se logro con `mdb-reader`; los drivers Access modernos del equipo no abren esta version antigua de Jet.

## Datos reales encontrados

- Catalogo ICG: 349 articulos consolidados (`Articulos`) y 349 referencias (`Referencias`).
- Precios de venta: 698 filas (`PreciosVenta`).
- Clientes: 514 filas (`Clientes`).
- Proveedores: 29 filas (`Proveedores`).
- Compras / entradas: 178 cabeceras (`ComprasCab`) y 274 lineas (`ComprasLin`).
- Movimientos de almacen: 283 filas (`Moviments`).
- Archivos auditados como cierre: 13 filas en `CierresDiarios`, una por cada CMS.

## Hallazgo critico sobre venta diaria

En estos 13 archivos las tablas de venta estan vacias:

- `TiquetsCab`: 0 filas.
- `TiquetsLin`: 0 filas.
- `TiquetsPag`: 0 filas.

Por eso la venta diaria de estos cierres queda en `0` con estado `Sin tickets`. No es un fallo del lector: los archivos abren, pero no contienen tickets/facturas. Para calcular venta diaria real se necesita exportar desde ICG FrontRest un CMS o Excel/JSON que incluya `TiquetsCab`, `TiquetsLin` y `TiquetsPag`, o el cierre/arquee donde ICG guarde las ventas.

## Formato de comunicacion observado

1. Archivo externo `.CMS`.
2. Compresion zlib/deflate.
3. Contenido descomprimido con identificador `ComsRest.mdbg`.
4. Base interna Microsoft Jet/Access antigua.
5. Tablas funcionales de FrontRest: articulos, referencias, compras, movimientos, clientes, proveedores, tickets y pagos.

## Estrategia Mise an Place - ICG

La vinculacion no debe depender solo del nombre. El orden correcto es:

1. `CodArticulo` de ICG.
2. `Referencia` de ICG.
3. Nombre normalizado como ayuda visual.

La web app ahora tiene el dataset `VinculosMiseICG` para guardar:

- Producto de Mise.
- Codigo ICG.
- Referencia ICG.
- Producto ICG.
- Cantidad a descontar por venta.
- Unidad.
- Estado activo.

Con ese puente, cuando llegue un CMS con tickets, cada linea de venta puede convertirse en `ConsumoMiseVentas` y disminuir Mise an Place de forma controlada.

## Entradas hacia ICG

Para entradas de inventario, los archivos utiles son:

- `ComprasCab`: cabecera de compra/entrada.
- `ComprasLin`: detalle de articulos, cantidad, precio y almacen.
- `Moviments`: movimientos de almacen.
- `Articulos` y `Referencias`: validacion de codigo/referencia.

La generacion de un `.CMS` nativo para importar en ICG debe escribir una base Jet con el mismo esquema y despues comprimirla en zlib. La app actualmente genera un CMS puente comprimido para intercambio seguro; no debe tratarse como reemplazo propietario de ICG hasta validar escritura/importacion con un entorno de prueba de FrontRest.

## Archivos generados

- `cms_audit/icg_frontrest_cms_extract_2026-06-23.json`: JSON consolidado importable por la web app.
- `tools/icg-cms-extractor.mjs`: conversor reutilizable para nuevos lotes CMS.
