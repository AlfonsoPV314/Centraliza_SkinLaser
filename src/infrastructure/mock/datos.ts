import type { Consulta, DatosApi, EstadoDatos } from "@/contracts/datos"
import { ERRORES } from "@/contracts/comunes"
import type {
  ColumnaCatalogo,
  FilaGuardada,
  Paciente,
  Registro,
  TipoCampo,
} from "@/domain/model"
import {
  CAMPOS_BASE,
  CAMPOS_DERIVADOS,
  catalogoConocido,
  definicion,
} from "@/domain/columns"
import { claveDuplicado, sonDuplicadas } from "@/domain/duplicates"
import { evaluarFiltro } from "@/domain/filters"
import { evaluarRango, rangoUsaHorario } from "@/domain/ranges"
import { aplanarFila, camposFaltantes, registrosACitas } from "@/domain/records"
import { normalizarValor, tieneErrores } from "@/domain/rules"
import { normalizarTexto } from "@/domain/text"
import { db, datosCambiaron, versionDatos } from "./db"
import { aGuardada, guardarFilas } from "./persistencia"
import { ahora, error, esperar, uid, usuarioDeToken } from "./util"

export async function catalogoCompleto(): Promise<ColumnaCatalogo[]> {
  const extras = await db.columnas.toArray()
  return [...catalogoConocido(), ...extras]
}

let cache: { clave: string; registros: Registro[] } | null = null

async function registrosBase(
  campoFecha: string,
  unidad: "filas" | "citas",
): Promise<Registro[]> {
  const clave = `${versionDatos()}|${campoFecha}|${unidad}`
  if (cache?.clave === clave) return cache.registros
  const [filas, pacientes, catalogo] = await Promise.all([
    db.filas.toArray(),
    db.pacientes.toArray(),
    catalogoCompleto(),
  ])
  const mp = new Map(pacientes.map((p) => [p.doc, p]))
  const mc = new Map(catalogo.map((c) => [c.clave, c]))
  let registros = filas.map((f) =>
    aplanarFila(f, mp.get(f.doc), mc, campoFecha),
  )
  if (unidad === "citas") registros = registrosACitas(registros, campoFecha)
  cache = { clave, registros }
  return registros
}

export async function tipoDeCampo(): Promise<(c: string) => TipoCampo> {
  const catalogo = await catalogoCompleto()
  const m = new Map(
    [...catalogo, ...CAMPOS_DERIVADOS].map((c) => [c.clave, c.tipo]),
  )
  return (c) => m.get(c) ?? "texto"
}

export async function ejecutarConsulta(c: Consulta): Promise<Registro[]> {
  const base = await registrosBase(c.campoFecha, c.unidad)
  const tipoDe = await tipoDeCampo()
  return base.filter(
    (r) =>
      (c.rango ? evaluarRango(c.rango, r.__fecha as string | null) : true) &&
      evaluarFiltro(c.filtros, r, tipoDe),
  )
}

async function guardarCorregida(importacionId: string, fila: FilaGuardada) {
  const previos = new Map<string, Paciente | null>()
  await guardarFilas([fila], previos)
  const imp = await db.importaciones.get(importacionId)
  if (imp) {
    const ya = new Set(imp.pacientesPrevios.map((p) => p.doc))
    await db.importaciones.update(importacionId, {
      insertadas: [...imp.insertadas, fila.id],
      pacientesPrevios: [
        ...imp.pacientesPrevios,
        ...[...previos]
          .filter(([d]) => !ya.has(d))
          .map(([doc, previo]) => ({ doc, previo })),
      ],
      conteos: { ...imp.conteos, nuevas: imp.conteos.nuevas + 1 },
    })
  }
}

export const datosMock: DatosApi = {
  async estado(token) {
    await usuarioDeToken(token)
    await esperar(150, 350)
    const [filas, pacientes, filasConError, duplicadosPendientes, ultima] =
      await Promise.all([
        db.filas.toArray(),
        db.pacientes.toArray(),
        db.filasError.count(),
        db.pendientes.count(),
        db.importaciones
          .where("estado")
          .equals("activa")
          .sortBy("creadaEn")
          .then((l) => l.pop()),
      ])
    const faltantesPorCampo: Record<string, number> = Object.fromEntries(
      CAMPOS_BASE.map((c) => [c, 0]),
    )
    let incompletos = 0
    for (const p of pacientes) {
      const f = camposFaltantes(p)
      if (f.length) incompletos++
      f.forEach((c) => faltantesPorCampo[c]++)
    }
    const porMes = new Map<string, number>()
    const anios = new Set<number>()
    for (const f of filas) {
      if (!f.fechaRegistro) continue
      porMes.set(
        f.fechaRegistro.slice(0, 7),
        (porMes.get(f.fechaRegistro.slice(0, 7)) ?? 0) + 1,
      )
      anios.add(Number(f.fechaRegistro.slice(0, 4)))
    }
    const estado: EstadoDatos = {
      filas: filas.length,
      pacientes: pacientes.length,
      ultimaCarga: ultima?.creadaEn ?? null,
      filasConError,
      duplicadosPendientes,
      pacientesIncompletos: incompletos,
      faltantesPorCampo,
      filasPorMes: [...porMes]
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-15)
        .map(([mes, n]) => ({ mes, filas: n })),
      aniosDisponibles: [...anios].sort(),
    }
    return estado
  },
  async columnas(token) {
    await usuarioDeToken(token)
    return catalogoCompleto()
  },
  async valoresDistintos(token, campo, limite = 40) {
    await usuarioDeToken(token)
    const conteo = new Map<string, number>()
    const sumar = (v?: { o: string }) =>
      v?.o && conteo.set(v.o, (conteo.get(v.o) ?? 0) + 1)
    await db.filas.each((f) => sumar(f.campos[campo]))
    if (CAMPOS_BASE.includes(campo as never))
      await db.pacientes.each((p) => sumar(p.campos[campo]))
    return [...conteo]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limite)
      .map(([v]) => v)
  },
  async buscarPorClaves(token, claves) {
    await usuarioDeToken(token)
    if (!claves.length) return []
    return db.filas.where("claveDup").anyOf(claves).toArray()
  },
  async listarFilas(token, q, p) {
    await usuarioDeToken(token)
    await esperar(120, 260)
    const nq = normalizarTexto(q)
    const filas = (await db.filas.toArray())
      .filter(
        (f) =>
          !nq ||
          normalizarTexto(
            `${f.doc} ${f.campos.nombre_completo?.o ?? ""} ${f.campos.concepto?.o ?? ""} ${f.archivo}`,
          ).includes(nq),
      )
      .sort((a, b) =>
        (b.fechaRegistro ?? "").localeCompare(a.fechaRegistro ?? ""),
      )
    return {
      items: filas.slice((p.pagina - 1) * p.porPagina, p.pagina * p.porPagina),
      total: filas.length,
      pagina: p.pagina,
      porPagina: p.porPagina,
    }
  },
  async filasConError(token) {
    await usuarioDeToken(token)
    await esperar(120, 260)
    return db.filasError.toArray()
  },
  async corregirFila(token, id, fila) {
    await usuarioDeToken(token)
    await esperar(250, 450)
    const reg = await db.filasError.get(id)
    if (!reg)
      throw error(
        ERRORES.noEncontrado,
        "Esta fila ya fue corregida o descartada.",
      )
    if (tieneErrores(fila))
      throw error(
        ERRORES.validacion,
        "La fila todavía tiene errores. Revise los campos marcados.",
      )
    const clave = claveDuplicado(fila)
    const existente = clave
      ? (await db.filas.where("claveDup").equals(clave).toArray()).find((g) =>
          sonDuplicadas(fila, g),
        )
      : undefined
    let resultado: "guardada" | "duplicada" = "guardada"
    await db.transaction(
      "rw",
      [db.filas, db.pacientes, db.filasError, db.pendientes, db.importaciones],
      async () => {
        if (existente) {
          await db.pendientes.put({
            id: uid("p-"),
            importacionId: reg.importacionId,
            nueva: fila,
            existenteId: existente.id,
            existente,
            creadaEn: ahora(),
          })
          resultado = "duplicada"
        } else {
          await guardarCorregida(
            reg.importacionId,
            aGuardada(fila, reg.importacionId),
          )
        }
        await db.filasError.delete(id)
      },
    )
    datosCambiaron()
    return resultado
  },
  async descartarFilaConError(token, id) {
    await usuarioDeToken(token)
    await esperar()
    await db.filasError.delete(id)
    datosCambiaron()
  },
  async duplicadosPendientes(token) {
    await usuarioDeToken(token)
    await esperar(120, 260)
    return db.pendientes.toArray()
  },
  async resolverDuplicado(token, id, accion) {
    await usuarioDeToken(token)
    await esperar()
    const p = await db.pendientes.get(id)
    if (!p) throw error(ERRORES.noEncontrado, "Este duplicado ya fue resuelto.")
    await db.transaction(
      "rw",
      [db.filas, db.pacientes, db.pendientes, db.importaciones],
      async () => {
        if (accion === "conservar_nueva" && p.existenteId) {
          const anterior = await db.filas.get(p.existenteId)
          if (anterior) {
            await db.filas.delete(anterior.id)
            const imp = await db.importaciones.get(p.importacionId)
            if (imp)
              await db.importaciones.update(imp.id, {
                reemplazadas: [...imp.reemplazadas, anterior],
              })
          }
        }
        if (accion !== "conservar_anterior")
          await guardarCorregida(
            p.importacionId,
            aGuardada(p.nueva, p.importacionId),
          )
        await db.pendientes.delete(id)
      },
    )
    datosCambiaron()
  },
  async pacientesIncompletos(token) {
    await usuarioDeToken(token)
    await esperar(150, 300)
    return (await db.pacientes.toArray())
      .map((p) => ({ ...p, faltantes: camposFaltantes(p) }))
      .filter((p) => p.faltantes.length > 0)
  },
  async actualizarPaciente(token, doc, campos) {
    await usuarioDeToken(token)
    await esperar()
    const p = await db.pacientes.get(doc)
    if (!p) throw error(ERRORES.noEncontrado, "El paciente ya no existe.")
    const nuevos = { ...p.campos }
    for (const [clave, valor] of Object.entries(campos)) {
      if (!valor.trim()) continue
      const tipo = definicion(clave)?.tipo ?? "texto"
      const v = normalizarValor(tipo, valor)
      if ((tipo === "email" || tipo === "fecha") && v.n === null) {
        throw error(
          ERRORES.validacion,
          tipo === "email"
            ? `El correo «${valor}» no tiene un formato válido.`
            : `La fecha «${valor}» no es válida (use día-mes-año).`,
          { campo: clave },
        )
      }
      nuevos[clave] = v
    }
    await db.pacientes.put({ ...p, campos: nuevos, actualizadoEn: ahora() })
    datosCambiaron()
  },
  async consultar(token, c) {
    await usuarioDeToken(token)
    return ejecutarConsulta(c)
  },
  async contar(token, c) {
    await usuarioDeToken(token)
    const r = await ejecutarConsulta(c)
    let sinHora = 0
    if (c.rango && rangoUsaHorario(c.rango)) {
      sinHora = (await ejecutarConsulta({ ...c, rango: null })).filter(
        (x) => typeof x.__fecha === "string" && x.__fecha.length === 10,
      ).length
    }
    return { total: r.length, sinHora }
  },
}
