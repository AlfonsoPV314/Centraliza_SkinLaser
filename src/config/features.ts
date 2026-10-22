// Configuración de características (LPS). Cada producto derivado activa/desactiva puntos de variación.
// Ver docs/LPS.md para el modelo completo y las restricciones entre características.
export const CARACTERISTICAS = {
  fuentes: { philaxmed: true },
  exportacion: { excel: true, pdf: true },
  notificaciones: { activo: true, sms: true, whatsapp: true },
  recuperarCorreoPorTelefono: true,
  consolidacionPagos: true,
  carpetaDescarga: true,
  administracionUsuarios: true,
} as const

export const SESION = {
  minutosInactividad: 15,
  segundosAviso: 60,
} as const

export const LIMITE_ARCHIVO_MB = 25
export const EXTENSIONES_PERMITIDAS = [
  "xlsx",
  "xls",
  "xlsm",
  "csv",
  "tsv",
  "txt",
] as const
