// Aplanado de filas guardadas a registros para filtros y reportes.
import { CAMPOS_BASE, definicion } from "./columns"
import { diaSemana, partesFecha } from "./dates"
import { claveCita } from "./duplicates"
import type {
  ColumnaCatalogo,
  FilaGuardada,
  Paciente,
  Registro,
  TipoCampo,
} from "./model"

const CAMPOS_PACIENTE = [
  ...CAMPOS_BASE,
  "nombres",
  "apellido_paterno",
  "apellido_materno",
  "telefono",
  "tipo_documento",
] as string[]

function valorPara(
  tipo: TipoCampo,
  v: { o: string; n: string | null } | undefined,
): string | number | null {
  if (!v || (v.o === "" && v.n === null)) return null
  if (tipo === "fecha" || tipo === "hora") return v.n
  if (tipo === "monto" || tipo === "numero")
    return v.n === null ? null : Number(v.n)
  if (tipo === "documento") return v.n ?? v.o
  return v.o
}

/** Agrega campos derivados de la fecha elegida (__anio, __mes, __trimestre, __dia_semana, __hora). */
export function agregarDerivados(r: Registro, campoFecha: string): Registro {
  const f = r[campoFecha]
  const p = typeof f === "string" ? partesFecha(f) : null
  r.__fecha = typeof f === "string" ? f : null
  r.__anio = p ? p.a : null
  r.__mes = p ? `${p.a}-${String(p.m).padStart(2, "0")}` : null
  r.__trimestre = p ? `${p.a}-T${Math.ceil(p.m / 3)}` : null
  r.__dia_semana = p ? diaSemana(p.a, p.m, p.d) : null
  r.__hora = p?.hora ? Number(p.hora.slice(0, 2)) : null
  return r
}

export function aplanarFila(
  fila: FilaGuardada,
  paciente: Paciente | undefined,
  catalogo: Map<string, ColumnaCatalogo>,
  campoFecha: string,
): Registro {
  const r: Registro = {
    __id: fila.id,
    __tipo_planilla: fila.tipoPlanilla,
    documento: fila.doc,
  }
  for (const [clave, v] of Object.entries(fila.campos)) {
    const tipo = definicion(clave)?.tipo ?? catalogo.get(clave)?.tipo ?? "texto"
    r[clave] = valorPara(tipo, v)
  }
  // Los atributos del paciente que falten en la fila se completan desde su ficha consolidada.
  if (paciente) {
    for (const clave of CAMPOS_PACIENTE) {
      if (r[clave] === undefined || r[clave] === null) {
        const tipo = definicion(clave)?.tipo ?? "texto"
        r[clave] = valorPara(tipo, paciente.campos[clave])
      }
    }
  }
  if (r.nombre_completo === null || r.nombre_completo === undefined) {
    const partes = [r.nombres, r.apellido_paterno, r.apellido_materno].filter(
      Boolean,
    )
    if (partes.length) r.nombre_completo = partes.join(" ")
  }
  r.fecha_registro = fila.fechaRegistro
  r.monto = fila.monto
  return agregarDerivados(r, campoFecha)
}

/** Consolida registros de pagos en citas (una fila por cita con monto total y detalle). */
export function registrosACitas(
  registros: Registro[],
  campoFecha: string,
): Registro[] {
  const citas = new Map<string, {
    r: Registro
    n: number
    conceptos: Set<string>
    medios: Set<string>
  }>()
  for (const r of registros) {
    if (r.__tipo_planilla !== "pagos") continue
    const clave = claveCita({
      doc: String(r.documento),
      fechaRegistro: r.fecha_registro as string ?? null,
      tipoPlanilla: "pagos",
      monto: null,
      campos: {
        id_cita: {
          o: "",
          n: r.id_cita ? String(r.id_cita).toLowerCase() : null,
        },
        profesional: {
          o: "",
          n: r.profesional ? String(r.profesional).toLowerCase() : null,
        },
      },
    })
    if (!clave) continue
    const c = citas.get(clave)
    if (c) {
      c.r.monto = (c.r.monto as number ?? 0) + (r.monto as number ?? 0)
      c.n++
      if (r.concepto) c.conceptos.add(String(r.concepto))
      if (r.medio_pago) c.medios.add(String(r.medio_pago))
    } else {
      citas.set(clave, {
        r: { ...r },
        n: 1,
        conceptos: new Set(r.concepto ? [String(r.concepto)] : []),
        medios: new Set(r.medio_pago ? [String(r.medio_pago)] : []),
      })
    }
  }
  return [...citas.values()].map(({ r, n, conceptos, medios }) =>
    agregarDerivados(
      {
        ...r,
        n_pagos: n,
        concepto: [...conceptos].join(" + "),
        medio_pago: [...medios].join(" + "),
      },
      campoFecha,
    ),
  )
}

/** Campos base vacíos de un paciente («datos incompletos»). */
export function camposFaltantes(p: Paciente): string[] {
  return CAMPOS_BASE.filter((c) => {
    if (c === "nombre_completo") {
      return (
        !p.campos.nombre_completo?.o &&
        !p.campos.nombres?.o &&
        !p.campos.apellido_paterno?.o
      )
    }
    return !p.campos[c]?.o
  })
}
