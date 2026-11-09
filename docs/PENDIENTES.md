# Pendientes y bitácora de cambios

Registro vivo para retomar el trabajo entre conversaciones. Actualizar al terminar cada bloque.

## Reglas del proyecto (vigentes)

- Vue 3.5 + Composition API (migrado desde React; `AGENTS.md` aún describe React y no se ha actualizado).
- Verificación: `pnpm exec vue-tsc --noEmit`, `pnpm build`, `pnpm test`. **No** ejecutar `pnpm format` (oxfmt 0.2 rompe tipos).
- No iniciar servidor de desarrollo (ya corre en `$PORT`).
- Arquitectura: `mfe` (presentación) / `application` / `domain` / `contracts` / `infrastructure/mock`. Ver `docs/ARQUITECTURA.md`.
- Todo cambio de datos pasa por `src/contracts/*.ts` y se implementa en `src/infrastructure/mock/*.ts`, con auditoría.

## Retroalimentación del cliente (ronda 3)

| # | Pedido | Estado |
| --- | --- | --- |
| 1 | Sinónimos «cliente», «nombre_cliente», «nombre_del_cliente» para nombre completo | Hecho (`domain/columns.ts`) |
| 2 | Datos › Registros: filtrar por cualquier columna y elegir columnas visibles | Hecho: búsqueda libre en todas las columnas (`coincideBusqueda`, cada palabra debe aparecer), panel de filtros (`EditorFiltros`), `ElegirColumnas.vue` con búsqueda (persistido en `localStorage`), definiciones en `datos/columnasTabla.ts` |
| 3 | Eliminar filas y columnas de la BD con búsqueda/filtros, confirmación e irreversibilidad explícita | Hecho: selección por fila, página o todas las coincidentes → `eliminarFilas`; `AdministrarColumnas.vue` (solo administradores, también exigido por el mock) → `eliminarColumna`; `documento`, `fecha_registro` y `monto` protegidas; confirmación escribiendo ELIMINAR (`ConfirmarEliminacion.vue`); transacción Dexie + auditoría |
| 4 | Generar reporte: alerta de datos por revisar (no se usan) con opción de incluirlos | Hecho: aviso en `Generador.vue` con enlace a revisar y casilla «Incluirlas de todos modos» → `Consulta.incluirPendientes` / `PeticionReporte.incluirPendientes` (el mock suma filas con error y duplicados nuevos) |
| 5 | Importar: columnas «No importar» en un desplegable al final de cada hoja | Hecho (`MapeoHoja.vue` + `FilaMapeo.vue`) |
| 6 | Selector de columnas con búsqueda por texto (importar, filtros, editor de reportes) | Hecho: `shared/ui/SelectorBuscable.vue` en MapeoHoja, CondicionFiltro, SelectorCampo y campo de fecha de plantillas |
| 7 | Datos › Con errores: selección múltiple/todas y acciones masivas (p. ej. marcar pasaporte extranjero) | Hecho: `BarraSeleccion.vue`, «Seleccionar las N con RUN no válido», marcar como pasaporte en lote (`domain/masivo.ts`), descartar en lote con confirmación |
| 8 | Duplicados: selección múltiple/todas con guardar ambas, usar nueva, conservar guardada, actualizar datos (combinar: base guardada + celdas nuevas) | Hecho: acciones en lote en `Duplicados.vue`; «Actualizar datos» = `actualizarDatos()` (reutiliza `combinarFilas`), las combinaciones que no validan quedan pendientes |

## Notas técnicas

- `Registros.vue` importa `EditorFiltros` desde `mfe/reportes`. Si se quiere aislar los micro-frontends, mover el editor de filtros a `shared/`.
- Las eliminaciones del mock no tienen pruebas automatizadas porque el entorno de pruebas no tiene IndexedDB (haría falta `fake-indexeddb`). Sí están probadas `coincideBusqueda` y la evaluación de filtros del dominio.
- El commit `58eb6e6` incluía `shared/ui/SelectorBuscable.vue` dañado; quedó reparado en el commit siguiente.

## Siguiente paso sugerido

- Revisión extremo a extremo de planillas de pagos sin RUN elegidas manualmente (worker → reglas → duplicados).
- Las acciones en lote llaman a la API fila por fila; con un backend real convendría un endpoint por lote.
