# Integracion WTF Sistema Web con ICG FrontRest

Esta guia describe el flujo seguro para operar ventas, compras y existencias entre ICG FrontRest PC y WTF Sistema Web.

## Regla principal

Importar un archivo nunca debe modificar inventario directamente. Primero se genera una vista previa, se revisan los vinculos y solo luego se aplica con clave administradora.

## Flujo recomendado

1. Exportar desde ICG FrontRest las tablas de ventas:
   - TiquetsCab
   - TiquetsLin
   - TiquetsPag
   - Articulos
   - Referencias

2. Importar el archivo en el modulo ICG FrontRest del sistema web.

3. Crear o revisar vinculos en la tabla `VinculosMiseICG`.

4. Entrar a la pestana `Ventas ICG`.

5. Pulsar `Generar consumo desde ventas`.

6. Revisar los estados:
   - Pendiente: listo para aplicar.
   - Sin vinculo: falta vincular el codigo ICG con un producto WTF.
   - Producto WTF no encontrado: el vinculo apunta a un producto que no existe.
   - Sin existencia: no hay cantidad suficiente para descontar.
   - Aplicado: ya fue aplicado antes y no debe repetirse.

7. Cuando todo este correcto, pulsar `Aplicar al inventario`.

## Campos necesarios en VinculosMiseICG

| Campo | Ejemplo | Uso |
|---|---|---|
| ModuloWTF | Inventario Bar | Donde se aplicara el descuento |
| ProductoWTF | AGUA | Producto exacto dentro del modulo WTF |
| ProductoMise | AGUA | Compatibilidad con vinculos antiguos de Mise |
| CodArticulo | 10034 | Codigo del articulo en ICG |
| Referencia | 10034 | Codigo alterno o barra |
| ProductoICG | AGUA | Nombre visible de ICG |
| CantidadPorVenta | 1 | Cantidad WTF que se descuenta por cada unidad vendida |
| Unidad | Uni | Unidad informativa |
| Activo | Si | Solo vinculos activos se procesan |

## Modulos WTF soportados

- Inventario Cocina
- Cuarto Frio Cocina
- Mise an Place Cocina
- Inventario Bar
- Cuarto Frio Bar
- Mise an Place Bar

## Prueba AGUA 10034

Se genero un paquete local de prueba en:

`icg-pruebas/`

Archivos incluidos:

- `WTF_ICG_AGUA_10034_EXISTENCIA_228.CMS`
- `WTF_ICG_AGUA_10034_EXISTENCIA_228.json`
- `WTF_ICG_AGUA_10034_ARTICULOS.csv`
- `WTF_ICG_AGUA_10034_MOVIMENTS.csv`

Importante: el `.CMS` generado por WTF es un paquete comprimido de intercambio del puente web. Puede servir para validar si ICG FrontRest lo acepta, pero si ICG requiere su formato propietario interno, es posible que no lo importe. Para escritura real hacia ICG, se debe confirmar el formato de importacion aceptado por ICG o usar CSV/Excel/API oficial.

## Seguridad operativa

- No aplicar ventas sin revisar bloqueos.
- No repetir el mismo archivo si ya quedo en estado Aplicado.
- Probar primero con un solo articulo.
- Hacer copia de seguridad de ICG antes de importar a la PC.
- Validar en ICG que el stock cambio correctamente.
- Si ICG rechaza el CMS, usar el CSV/Excel como camino de prueba y confirmar el formato de importacion nativo.
