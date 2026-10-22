// Motor de reglas declarativo de estandarización y detección de errores de formato.
// Cada regla: id, descripción, severidad y una función pura que devuelve un mensaje o null.
import { analizarDocumento, formatearRun } from "./run"
import { hoyISO, parsearFecha, parsearHora } from "./dates"
import { correoValido, normalizarCorreo, normalizarTelefono } from "./contact"
import { parsearMonto } from "./format"
import { limpiarOriginal, normalizarTexto } from "./text"
import { definicion, type MapeoColumna } from "./columns"
import type {
  FilaProcesada,
  Problema,
  Severidad,
  TipoCampo,
  TipoPlanilla,
  ValorCampo,
} from "./model"

export interface Regla {
  id: string
  descripcion: string
  severidad: Severidad
  campo: string
  evaluar: (fila: FilaProcesada) => string | null
}

const crudo = (f: FilaProcesada, campo: string) =>
  limpiarOriginal(f.crudos[campo])

export const REGLAS: Regla[] = [
  {
    id: "DOC-01",
    descripcion: "El RUN o pasaporte es obligatorio",
    severidad: "error",
    campo: "documento",
    evaluar: (f) =>
      crudo(f, "documento")
        ? null
        : "No tiene RUN ni pasaporte. Sin este dato no se puede identificar al paciente. Escríbalo aquí para guardar la fila.",
  },
  {
    id: "DOC-02",
    descripcion: "El dígito verificador del RUN debe ser correcto",
    severidad: "error",
    campo: "documento",
    evaluar: (f) => {
      const v = crudo(f, "documento")
      if (!v) return null
      const r = analizarDocumento(v, { forzarPasaporte: f.forzarPasaporte })
      if (r.motivo !== "digito_verificador") return null
      const cuerpo = v.replace(/[.\s-]/g, "").slice(0, -1)
      return `RUN inválido: ${v} no coincide con su dígito verificador (con ese número debería terminar en ${r.dvEsperado}, por ejemplo ${formatearRun(`${cuerpo}-${r.dvEsperado}`)}). Revise el número o corríjalo aquí. Si es un pasaporte extranjero, márquelo como pasaporte.`
    },
  },
  {
    id: "DOC-03",
    descripcion:
      "El documento debe ser un RUN chileno o un pasaporte (5 a 15 letras o números)",
    severidad: "error",
    campo: "documento",
    evaluar: (f) => {
      const v = crudo(f, "documento")
      if (!v) return null
      const r = analizarDocumento(v, { forzarPasaporte: f.forzarPasaporte })
      return r.motivo === "formato"
        ? `«${v}» no es un RUN chileno ni un pasaporte válido (un pasaporte tiene entre 5 y 15 letras o números). Corríjalo aquí.`
        : null
    },
  },
  {
    id: "FNAC-01",
    descripcion:
      "La fecha de nacimiento debe existir y tener un formato reconocido",
    severidad: "error",
    campo: "fecha_nacimiento",
    evaluar: (f) => {
      const v = f.crudos.fecha_nacimiento
      if (v === undefined || v === null || limpiarOriginal(v) === "")
        return null
      return parsearFecha(v)
        ? null
        : `La fecha de nacimiento «${limpiarOriginal(v)}» no existe o no tiene un formato reconocido. Use día-mes-año, por ejemplo 05-03-1980.`
    },
  },
  {
    id: "FNAC-02",
    descripcion: "La fecha de nacimiento no puede ser futura",
    severidad: "error",
    campo: "fecha_nacimiento",
    evaluar: (f) => {
      const p = parsearFecha(f.crudos.fecha_nacimiento)
      return p && p.fecha > hoyISO()
        ? `La fecha de nacimiento ${limpiarOriginal(f.crudos.fecha_nacimiento)} está en el futuro. Revise el año.`
        : null
    },
  },
  {
    id: "MAIL-01",
    descripcion: "El correo debe tener un formato válido",
    severidad: "error",
    campo: "email",
    evaluar: (f) => {
      const v = crudo(f, "email")
      return v && !correoValido(v)
        ? `El correo «${v}» no tiene un formato válido (ejemplo: nombre@dominio.cl). Corríjalo aquí o déjelo vacío.`
        : null
    },
  },
  {
    id: "FREG-01",
    descripcion: "La fecha de registro debe tener un formato reconocido",
    severidad: "error",
    campo: "fecha_registro",
    evaluar: (f) => {
      const v = f.crudos.fecha_registro
      if (v === undefined || v === null || limpiarOriginal(v) === "")
        return null
      return parsearFecha(v)
        ? null
        : `La fecha de registro «${limpiarOriginal(v)}» no existe o no tiene un formato reconocido (use día-mes-año).`
    },
  },
  {
    id: "FREG-02",
    descripcion: "Conviene que toda fila tenga fecha de registro",
    severidad: "advertencia",
    campo: "fecha_registro",
    evaluar: (f) =>
      limpiarOriginal(f.crudos.fecha_registro)
        ? null
        : "No tiene fecha de registro: no aparecerá en reportes por período ni podrá compararse para detectar duplicados.",
  },
  {
    id: "HORA-01",
    descripcion: "La hora debe tener formato HH:mm",
    severidad: "advertencia",
    campo: "hora_registro",
    evaluar: (f) => {
      const v = f.crudos.hora_registro
      if (v === undefined || limpiarOriginal(v) === "") return null
      return parsearHora(v)
        ? null
        : `La hora «${limpiarOriginal(v)}» no se reconoce (use 24 h, por ejemplo 14:30). Se guardará sin hora.`
    },
  },
  {
    id: "TEL-01",
    descripcion: "El teléfono debe poder llevarse al formato +56",
    severidad: "advertencia",
    campo: "telefono",
    evaluar: (f) => {
      const v = crudo(f, "telefono")
      return v && !normalizarTelefono(v)
        ? `El teléfono «${v}» no se pudo llevar al formato +56 9 XXXX XXXX. Se guardará tal cual.`
        : null
    },
  },
  {
    id: "MONTO-01",
    descripcion: "En planillas de pagos, el monto debe ser un número",
    severidad: "error",
    campo: "monto",
    evaluar: (f) => {
      if (f.tipoPlanilla !== "pagos") return null
      const v = crudo(f, "monto")
      if (!v)
        return "La fila de pago no tiene monto. Escríbalo aquí (solo números, por ejemplo 45000)."
      return parsearMonto(f.crudos.monto) === null
        ? `El monto «${v}» no es un número válido. Escríbalo solo con números, por ejemplo 45000.`
        : null
    },
  },
]

/** Normaliza un valor según su tipo. Devuelve original limpio y valor normalizado (o null si vacío/inválido). */
export function normalizarValor(
  tipo: TipoCampo,
  valor: unknown,
  opciones: { forzarPasaporte?: boolean } = {},
): ValorCampo {
  const o =
    typeof valor === "number" && tipo !== "fecha" && tipo !== "hora"
      ? String(valor)
      : limpiarOriginal(valor)
  if (valor === null || valor === undefined || o === "")
    return { o: "", n: null }
  switch (tipo) {
    case "documento":
      return { o, n: analizarDocumento(valor, opciones).normalizado }
    case "fecha": {
      const p = parsearFecha(valor)
      const original =
        typeof valor === "number" && p
          ? p.fecha.split("-").reverse().join("-")
          : o
      return {
        o: original,
        n: p ? (p.hora ? `${p.fecha}T${p.hora}` : p.fecha) : null,
      }
    }
    case "hora": {
      const h = parsearHora(valor)
      return { o: typeof valor === "number" && h ? h : o, n: h }
    }
    case "email":
      return { o, n: correoValido(valor) ? normalizarCorreo(valor) : null }
    case "telefono":
      return { o, n: normalizarTelefono(valor) }
    case "monto":
    case "numero": {
      const n = parsearMonto(valor)
      return { o, n: n === null ? null : String(n) }
    }
    default:
      return { o, n: normalizarTexto(valor) }
  }
}

export interface ContextoFila {
  uid: string
  archivo: string
  hoja?: string
  numero: number
  tipoPlanilla: TipoPlanilla
  tiposExtra: Record<string, TipoCampo>
  forzarPasaporte?: boolean
}

/** Normaliza y valida una fila a partir de sus valores crudos (clave de campo → valor). */
export function procesarFila(
  crudos: Record<string, unknown>,
  ctx: ContextoFila,
): FilaProcesada {
  const campos: Record<string, ValorCampo> = {}
  for (const [clave, valor] of Object.entries(crudos)) {
    const tipo = definicion(clave)?.tipo ?? ctx.tiposExtra[clave] ?? "texto"
    campos[clave] = normalizarValor(tipo, valor, {
      forzarPasaporte: ctx.forzarPasaporte,
    })
  }
  const doc = analizarDocumento(crudos.documento, {
    forzarPasaporte: ctx.forzarPasaporte,
  })
  if (doc.ok && doc.tipo)
    campos.tipo_documento = {
      o: doc.tipo === "run" ? "RUN" : "Pasaporte",
      n: doc.tipo,
    }

  const fecha = parsearFecha(crudos.fecha_registro)
  const hora = parsearHora(crudos.hora_registro) ?? fecha?.hora ?? null
  const fechaRegistro = fecha
    ? hora
      ? `${fecha.fecha}T${hora}`
      : fecha.fecha
    : null
  if (fechaRegistro)
    campos.fecha_registro = {
      o: campos.fecha_registro?.o ?? fechaRegistro,
      n: fechaRegistro,
    }

  const fila: FilaProcesada = {
    uid: ctx.uid,
    archivo: ctx.archivo,
    hoja: ctx.hoja,
    numero: ctx.numero,
    tipoPlanilla: ctx.tipoPlanilla,
    crudos,
    campos,
    doc: doc.ok ? doc.normalizado : null,
    tipoDoc: doc.ok ? doc.tipo : null,
    forzarPasaporte: ctx.forzarPasaporte,
    fechaRegistro,
    monto: ctx.tipoPlanilla === "pagos" ? parsearMonto(crudos.monto) : null,
    problemas: [],
  }
  fila.problemas = evaluarReglas(fila)
  return fila
}

export function evaluarReglas(
  fila: FilaProcesada,
  reglas: Regla[] = REGLAS,
): Problema[] {
  const problemas: Problema[] = []
  for (const r of reglas) {
    const mensaje = r.evaluar(fila)
    if (mensaje)
      problemas.push({
        regla: r.id,
        campo: r.campo,
        severidad: r.severidad,
        mensaje,
      })
  }
  return problemas
}

export const tieneErrores = (f: FilaProcesada) =>
  f.problemas.some((p) => p.severidad === "error")

export interface OpcionesPlanilla {
  archivo: string
  hoja?: string
  filas: unknown[][]
  filaEncabezado: number
  mapeo: MapeoColumna[]
  tipoPlanilla: TipoPlanilla
  prefijoUid: string
}

/** Convierte las filas de una hoja en filas procesadas según el mapeo confirmado por el usuario. */
export function procesarPlanilla(
  op: OpcionesPlanilla,
  alAvanzar?: (proporcion: number) => void,
): FilaProcesada[] {
  const tiposExtra: Record<string, TipoCampo> = {}
  for (const m of op.mapeo)
    if (m.destino === "extra" && m.claveExtra)
      tiposExtra[m.claveExtra] = m.tipoExtra ?? "texto"
  const resultado: FilaProcesada[] = []
  const total = op.filas.length
  for (let i = op.filaEncabezado + 1; i < total; i++) {
    const fila = op.filas[i] ?? []
    if (
      !fila.some(
        (c) => c !== null && c !== undefined && String(c).trim() !== "",
      )
    )
      continue
    const crudos: Record<string, unknown> = {}
    for (const m of op.mapeo) {
      if (m.destino === "ignorar") continue
      const clave = m.destino === "extra" ? m.claveExtra! : m.destino
      const valor = fila[m.indice]
      if (valor !== undefined && valor !== null && String(valor).trim() !== "")
        crudos[clave] = valor
    }
    resultado.push(
      procesarFila(crudos, {
        uid: `${op.prefijoUid}-${i}`,
        archivo: op.archivo,
        hoja: op.hoja,
        numero: i + 1,
        tipoPlanilla: op.tipoPlanilla,
        tiposExtra,
      }),
    )
    if (alAvanzar && i % 500 === 0) alAvanzar(i / total)
  }
  alAvanzar?.(1)
  return resultado
}
