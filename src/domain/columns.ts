import { claveDesdeEncabezado, limpiarOriginal } from "./text"
import type { ColumnaCatalogo, TipoCampo, TipoPlanilla } from "./model"
import { parsearFecha } from "./dates"
import { parsearMonto } from "./format"

/** Los 7 atributos base (irreductibles). */
export const CAMPOS_BASE = [
  "documento",
  "nombre_completo",
  "fecha_nacimiento",
  "prevision",
  "direccion",
  "email",
  "seguro",
] as const
export type CampoBase = typeof CAMPOS_BASE[number]

export interface DefinicionCampo {
  etiqueta: string
  tipo: TipoCampo
  base: boolean
  grupo: "base" | "paciente" | "registro" | "pago"
  sinonimos: string[]
  ayuda?: string
}

export const CAMPOS_CONOCIDOS = {
  documento: {
    etiqueta: "RUN / pasaporte",
    tipo: "documento",
    base: true,
    grupo: "base",
    ayuda: "Identifica al paciente. Obligatorio.",
    sinonimos: [
      "rut",
      "run",
      "rut_paciente",
      "run_paciente",
      "documento",
      "n_documento",
      "numero_documento",
      "nro_documento",
      "pasaporte",
      "rut_pasaporte",
      "run_pasaporte",
      "identificacion",
      "dni",
      "rut_o_pasaporte",
      "id_paciente",
    ],
  },
  nombre_completo: {
    etiqueta: "Nombre completo",
    tipo: "texto",
    base: true,
    grupo: "base",
    sinonimos: [
      "nombre_completo",
      "nombre",
      "paciente",
      "nombre_paciente",
      "nombre_del_paciente",
    ],
  },
  fecha_nacimiento: {
    etiqueta: "Fecha de nacimiento",
    tipo: "fecha",
    base: true,
    grupo: "base",
    sinonimos: [
      "fecha_nacimiento",
      "fecha_de_nacimiento",
      "f_nacimiento",
      "nacimiento",
      "fec_nac",
      "fnac",
      "f_nac",
    ],
  },
  prevision: {
    etiqueta: "Previsión",
    tipo: "texto",
    base: true,
    grupo: "base",
    sinonimos: [
      "prevision",
      "isapre",
      "sistema_salud",
      "prevision_salud",
      "prevision_de_salud",
    ],
  },
  direccion: {
    etiqueta: "Dirección",
    tipo: "texto",
    base: true,
    grupo: "base",
    sinonimos: ["direccion", "domicilio", "direccion_particular"],
  },
  email: {
    etiqueta: "Correo electrónico",
    tipo: "email",
    base: true,
    grupo: "base",
    sinonimos: ["email", "correo", "correo_electronico", "e_mail", "mail"],
  },
  seguro: {
    etiqueta: "Seguro",
    tipo: "texto",
    base: true,
    grupo: "base",
    sinonimos: [
      "seguro",
      "seguro_complementario",
      "aseguradora",
      "seguro_salud",
    ],
  },
  nombres: {
    etiqueta: "Nombres",
    tipo: "texto",
    base: false,
    grupo: "paciente",
    sinonimos: ["nombres", "primer_nombre"],
  },
  apellido_paterno: {
    etiqueta: "Apellido paterno",
    tipo: "texto",
    base: false,
    grupo: "paciente",
    sinonimos: [
      "apellido_paterno",
      "ap_paterno",
      "apellido1",
      "primer_apellido",
    ],
  },
  apellido_materno: {
    etiqueta: "Apellido materno",
    tipo: "texto",
    base: false,
    grupo: "paciente",
    sinonimos: [
      "apellido_materno",
      "ap_materno",
      "apellido2",
      "segundo_apellido",
    ],
  },
  telefono: {
    etiqueta: "Teléfono",
    tipo: "telefono",
    base: false,
    grupo: "paciente",
    sinonimos: [
      "telefono",
      "celular",
      "fono",
      "movil",
      "telefono_movil",
      "telefono_celular",
    ],
  },
  fecha_registro: {
    etiqueta: "Fecha de registro (PhilaxMed)",
    tipo: "fecha",
    base: false,
    grupo: "registro",
    ayuda:
      "Fecha en que el dato se registró en PhilaxMed. Se usa para duplicados y períodos.",
    sinonimos: [
      "fecha_registro",
      "fecha_de_registro",
      "fecha_ingreso",
      "fecha",
      "fecha_creacion",
      "registrado_el",
      "fecha_registro_philaxmed",
    ],
  },
  hora_registro: {
    etiqueta: "Hora de registro",
    tipo: "hora",
    base: false,
    grupo: "registro",
    sinonimos: ["hora", "hora_registro", "hora_de_registro"],
  },
  id_cita: {
    etiqueta: "N° de atención / cita",
    tipo: "texto",
    base: false,
    grupo: "pago",
    sinonimos: [
      "id_cita",
      "n_cita",
      "numero_cita",
      "n_atencion",
      "id_atencion",
      "folio_atencion",
      "nro_atencion",
      "cita",
    ],
  },
  profesional: {
    etiqueta: "Profesional",
    tipo: "texto",
    base: false,
    grupo: "pago",
    sinonimos: [
      "profesional",
      "medico",
      "doctor",
      "dr",
      "tratante",
      "especialista",
      "profesional_tratante",
    ],
  },
  concepto: {
    etiqueta: "Concepto / prestación",
    tipo: "texto",
    base: false,
    grupo: "pago",
    sinonimos: [
      "concepto",
      "prestacion",
      "detalle",
      "glosa",
      "procedimiento",
      "tratamiento",
    ],
  },
  medio_pago: {
    etiqueta: "Medio de pago",
    tipo: "texto",
    base: false,
    grupo: "pago",
    sinonimos: [
      "medio_pago",
      "medio_de_pago",
      "forma_pago",
      "forma_de_pago",
      "tipo_pago",
    ],
  },
  monto: {
    etiqueta: "Monto (CLP)",
    tipo: "monto",
    base: false,
    grupo: "pago",
    sinonimos: [
      "monto",
      "valor",
      "importe",
      "total",
      "monto_pagado",
      "monto_clp",
      "pago",
    ],
  },
} satisfies Record<string, DefinicionCampo>

export type CampoConocido = keyof typeof CAMPOS_CONOCIDOS
export const LISTA_CAMPOS_CONOCIDOS = Object.keys(
  CAMPOS_CONOCIDOS,
) as CampoConocido[]

export function definicion(campo: string): DefinicionCampo | undefined {
  return (CAMPOS_CONOCIDOS as Record<string, DefinicionCampo>)[campo]
}

export interface MapeoColumna {
  indice: number
  encabezado: string
  destino: CampoConocido | "extra" | "ignorar"
  claveExtra?: string
  tipoExtra?: TipoCampo
  confianza: "alta" | "media" | "ninguna"
}

/** Propone coincidencias automáticas por sinónimos. El usuario las confirma o corrige. */
export function sugerirMapeo(
  encabezados: unknown[],
  muestras: unknown[][] = [],
): MapeoColumna[] {
  const candidatos: { indice: number; campo: CampoConocido; puntaje: number }[] =
    []
  encabezados.forEach((enc, indice) => {
    const clave = claveDesdeEncabezado(enc)
    if (!clave) return
    for (const campo of LISTA_CAMPOS_CONOCIDOS) {
      const sin = CAMPOS_CONOCIDOS[campo].sinonimos
      if (sin.includes(clave)) candidatos.push({ indice, campo, puntaje: 3 })
      else if (
        sin.some(
          (s) =>
            s.length > 3 &&
            (clave.startsWith(`${s}_`) || clave.endsWith(`_${s}`)),
        )
      )
        candidatos.push({ indice, campo, puntaje: 1 })
    }
  })
  candidatos.sort((a, b) => b.puntaje - a.puntaje)
  const usadoCampo = new Set<string>()
  const asignado = new Map<number, { campo: CampoConocido; puntaje: number }>()
  for (const c of candidatos) {
    if (usadoCampo.has(c.campo) || asignado.has(c.indice)) continue
    usadoCampo.add(c.campo)
    asignado.set(c.indice, c)
  }
  const clavesExtra = new Set<string>()
  return encabezados.map((enc, indice) => {
    const encabezado = limpiarOriginal(enc) || `Columna ${indice + 1}`
    const a = asignado.get(indice)
    if (a)
      return {
        indice,
        encabezado,
        destino: a.campo,
        confianza: a.puntaje >= 3 ? "alta" : "media",
      }
    let clave = claveDesdeEncabezado(encabezado) || `columna_${indice + 1}`
    if (definicion(clave)) clave = `extra_${clave}`
    while (clavesExtra.has(clave)) clave = `${clave}_2`
    clavesExtra.add(clave)
    const valores = muestras.map((f) => f[indice])
    return {
      indice,
      encabezado,
      destino: "extra",
      claveExtra: clave,
      tipoExtra: inferirTipo(valores),
      confianza: "ninguna",
    }
  })
}

/** Una planilla es «de pagos» si trae monto o medio de pago. */
export function detectarTipoPlanilla(mapeo: MapeoColumna[]): TipoPlanilla {
  return mapeo.some((m) => m.destino === "monto" || m.destino === "medio_pago")
    ? "pagos"
    : "pacientes"
}

/** Tipo inferido para columnas extra a partir de una muestra de valores. */
export function inferirTipo(valores: unknown[]): TipoCampo {
  const llenos = valores.filter(
    (v) => v !== null && v !== undefined && String(v).trim() !== "",
  )
  if (llenos.length === 0) return "texto"
  const proporcion = (pred: (v: unknown) => boolean) =>
    llenos.filter(pred).length / llenos.length
  if (
    proporcion(
      (v) =>
        typeof v === "string" && /[/-]/.test(v) && parsearFecha(v) !== null,
    ) >= 0.8
  )
    return "fecha"
  if (
    proporcion(
      (v) => typeof v === "number" || /^-?[\d.,]+$/.test(String(v).trim()),
    ) >= 0.8
  ) {
    return proporcion((v) => /\$/.test(String(v))) > 0.3 ? "monto" : "numero"
  }
  if (
    proporcion((v) => /\$\s?\d/.test(String(v)) && parsearMonto(v) !== null) >=
    0.8
  )
    return "monto"
  return "texto"
}

/** Busca la fila de encabezado entre las primeras 15 filas (planillas con títulos arriba). */
export function detectarFilaEncabezado(filas: unknown[][]): number {
  let mejor = 0
  let mejorPuntaje = -1
  const limite = Math.min(filas.length, 15)
  for (let i = 0; i < limite; i++) {
    const fila = filas[i] ?? []
    const textos = fila.filter(
      (c) =>
        typeof c === "string" &&
        c.trim() !== "" &&
        !/^\d+([.,]\d+)?$/.test(c.trim()),
    )
    if (textos.length < 2) continue
    const coincidencias = textos.filter((c) => {
      const clave = claveDesdeEncabezado(c)
      return LISTA_CAMPOS_CONOCIDOS.some((k) =>
        CAMPOS_CONOCIDOS[k].sinonimos.includes(clave),
      )
    }).length
    const puntaje = coincidencias * 3 + textos.length
    if (puntaje > mejorPuntaje) {
      mejorPuntaje = puntaje
      mejor = i
    }
  }
  return mejor
}

/** Catálogo de columnas conocidas (siempre disponibles para filtros y reportes). */
export function catalogoConocido(): ColumnaCatalogo[] {
  return LISTA_CAMPOS_CONOCIDOS.map((clave) => ({
    clave,
    etiqueta: CAMPOS_CONOCIDOS[clave].etiqueta,
    tipo: CAMPOS_CONOCIDOS[clave].tipo,
    base: CAMPOS_CONOCIDOS[clave].base,
    origen: "conocida" as const,
  }))
}

/** Campos derivados de la fecha elegida, útiles para agrupar en gráficos. */
export const CAMPOS_DERIVADOS: ColumnaCatalogo[] = [
  {
    clave: "__anio",
    etiqueta: "Año",
    tipo: "numero",
    base: false,
    origen: "conocida",
  },
  {
    clave: "__mes",
    etiqueta: "Mes",
    tipo: "texto",
    base: false,
    origen: "conocida",
  },
  {
    clave: "__trimestre",
    etiqueta: "Trimestre",
    tipo: "texto",
    base: false,
    origen: "conocida",
  },
  {
    clave: "__dia_semana",
    etiqueta: "Día de la semana",
    tipo: "numero",
    base: false,
    origen: "conocida",
  },
  {
    clave: "__hora",
    etiqueta: "Hora del día",
    tipo: "numero",
    base: false,
    origen: "conocida",
  },
]
