# Arquitectura

Prototipo frontend de SkinLaser / Centraliza, preparado para el ecosistema de microservicios descrito en
«Pingeso — Propuesta de Microservicios (LPS)» y «Lineamientos Técnicos y Plan Incremental».

## Stack

| Capa | Lineamiento | Este repositorio |
| --- | --- | --- |
| Interfaces | Vue.js 3.5, Composition API | Vue 3.5 + `<script setup>`, Vue Router 4, Tailwind CSS v4 |
| Microservicios | Go 1.23, Clean Architecture (handlers, services, repositories) | Aún no existen: se simulan en `src/infrastructure/mock` |
| Contratos | OpenAPI 3.1, API-First | Interfaces TypeScript en `src/contracts`, una por microservicio |
| Persistencia | MongoDB | Simulada en el navegador con IndexedDB (Dexie) |
| Calidad | SonarQube, Trivy | Pruebas con Vitest (`pnpm test`) y verificación de tipos con `vue-tsc` |

## Capas del frontend

```
src/
  mfe/              presentación: un frontend modular por dominio (auth, dashboard, ingesta, reportes, admin, perfil)
  shell/            ensamblaje: layouts, router, navegación y registro de módulos (`modulos.ts`)
  shared/           componentes de UI, composables y helpers de presentación reutilizables
  application/      casos de uso transversales: sesión, servicios, errores, eventos, notificaciones, tema
  domain/           reglas puras sin dependencias de UI ni E/S: RUN, reglas de validación, duplicados,
                    combinación por celda, filtros, períodos, plantillas, estadísticas
  contracts/        interfaces de los microservicios (equivalente TypeScript de cada contrato OpenAPI)
  infrastructure/   implementaciones: `mock/` (backend simulado), `ingesta/` (lectura de planillas en worker),
                    `export/` (Excel/PDF) y `servicios.ts` (punto único que elige la implementación)
```

Reglas de dependencia: `mfe` → `application`/`shared`/`domain`/`contracts`; `application` → `contracts`;
`infrastructure` implementa `contracts` y usa `domain`. Ningún módulo de `mfe` importa `infrastructure/mock`.

Cada `mfe/<modulo>/index.ts` exporta un `ModuloFrontend` (rutas con carga diferida y entradas de navegación),
lo que mantiene las vistas aisladas para el ensamblaje final (lineamiento «Frontends modulares»).

## Reemplazo de los mocks

`src/infrastructure/servicios.ts` crea la instancia de `Servicios`. Para conectar los microservicios reales basta
con una implementación HTTP de las mismas interfaces de `src/contracts`, generada o escrita a partir de cada
OpenAPI; la presentación no cambia. Los errores siguen el formato `ProblemaApi` (RFC 9457) definido en
`contracts/comunes.ts`.

## Correspondencia con los microservicios

| Microservicio (PT) | Responsabilidad | Contrato | Uso en el frontend |
| --- | --- | --- | --- |
| MS Reportes (PT1) | Recibe datos e ID de plantilla y devuelve PDF o Excel | `ReportesApi` | `mfe/reportes/generar` |
| MS Gestor de Información (PT2) | ETL: recibir, limpiar, validar e insertar datos masivos | `IngestaApi`, `DatosApi` | `mfe/ingesta` (carga, errores, duplicados, historial) |
| MS Plantillas de Reporte (PT3) | Crear, versionar y almacenar plantillas | `PlantillasApi` | `mfe/reportes` (lista y editor) |
| MS Formularios (PT4) | Formularios dinámicos y respuestas | — | Fuera del alcance de este prototipo |
| MS Digitalización / OCR (PT5) | Imagen digitalizada → texto → JSON | — | Fuera del alcance; la ingesta acepta planillas Excel/CSV |
| MS Usuarios y Roles (PT6) | Autenticación, roles y emisión de JWT | `AuthApi`, `UsuariosApi` | `mfe/auth`, `mfe/admin`, `mfe/perfil`; cuentas creadas solo por administradores |
| MS Gestor Documental (PT7) | Almacenamiento seguro de archivos y metadatos | parte de `IngestaApi` (originales) | Las planillas originales se guardan con su SHA-256 y se descargan desde el historial |
| MS Auditoría (PT8) | Trazabilidad central de eventos | `AuditoriaApi` | Confirmar/deshacer cargas, correcciones, descartes y resolución de duplicados quedan auditados |
| MS Agenda (PT9) | Reservas, colisiones y bloqueos | — | Fuera del alcance |
| MS Notificaciones (PT10) | Gateway de correos y alertas | `NotificacionesApi` | Simulado: los correos se muestran en un buzón local, nunca se envían |

## Flujo de ingesta (PT2)

1. Se suben uno o varios archivos; cada hoja se elige o descarta explícitamente y se mapea a pacientes o pagos.
   Las columnas ignoradas pueden guardarse de forma permanente.
2. El worker lee y normaliza las filas; `domain/rules.ts` valida (RUN/RUT con dígito verificador, fechas,
   correos…). Los pagos pueden no tener documento (advertencia `DOC-04`); los pacientes lo requieren (`DOC-01`).
3. `domain/duplicates.ts` detecta duplicados por documento + fecha de registro, o por N° de atención cuando no
   hay documento.
4. Pantalla intermedia: revisar errores y duplicados ahora, o importar y revisarlos después en «Datos».
5. Los duplicados se resuelven conservando una versión, ambas, o combinando celda por celda (`domain/merge.ts`).
6. La confirmación es una transacción con historial que permite deshacer.

## Plan incremental

- Hito 1: contratos publicados y endpoints respondiendo con mocks — equivale al estado actual del frontend.
- Hito 2: reemplazo total de mocks por servicios Go con MongoDB — se sustituye `infrastructure/mock` por
  clientes HTTP sin tocar `mfe`, `application` ni `domain`.
- Fase 3: ensamblaje y despliegue por cliente — `config/brand.ts` y `config/features.ts` concentran la
  personalización por cliente.
