import { COLUMNAS_PROTEGIDAS, type Consulta, type DatosApi, type EstadoDatos } from "@/contracts/datos"
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
import { contarCondiciones, evaluarFiltro, type Grupo } from "@/domain/filters"
import { evaluarRango, rangoUsaHorario } from "@/domain/ranges"
import { aplanarFila, camposFaltantes, registrosACitas } from "@/domain/records"
import { normalizarValor, tieneErrores } from "@/domain/rules"
import { coincideBusqueda } from "@/domain/text"
import { db, datosCambiaron, versionDatos } from "./db"
import { aGuardada, guardarFilas } from "./persistencia"
import { ahora, error, esperar, exigirAdmin, uid, usuarioDeToken } from "./util"
import { registrarEvento } from "./auditoria"

const describirFila = (f: { archivo: string; numero: number }) =>
  `${f.archivo}, fila ${f.numero}`

export async function catalogoCompleto(): Promise<ColumnaCatalogo[]> {
  const extras = await db.columnas.toArray()
  return [...catalogoConocido(), ...extras]
}

let cache: { clave: string; registros: Registro[] } | null = null

async function registrosBase(
  campoFecha: string,
  unidad: "filas" | "citas",
  incluirPendientes = false,
): Promise<Registro[]> {
  const clave = `${versionDatos()}|${campoFecha}|${unidad}|${incluirPendientes}`
  if (cache?.clave === clave) return cache.registros
  const [guardadas, pendientes, pacientes, catalogo] = await Promise.all([
    db.filas.toArray(),
    incluirPendientes ? filasPendientes() : Promise.resolve([]),
    db.pacientes.toArray(),
    catalogoCompleto(),
  ])
  const filas = [...guardadas, ...pendientes]
  const mp = new Map(pacientes.map((p) => [p.doc, p]))
  const mc = new Map(catalogo.map((c) => [c.clave, c]))
  let registros = filas.map((f) =>
    aplanarFila(f, f.doc ? mp.get(f.doc) : undefined, mc, campoFecha),
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

/** Filas con errores y duplicados nuevos sin resolver, con forma de fila guardada (solo para consultas). */
async function filasPendientes(): Promise<FilaGuardada[]> {
  const [errores, dups] = await Promise.all([db.filasError.toArray(), db.pendientes.toArray()])
  return [
    ...errores.map((e) => ({ ...aGuardada(e.fila, e.importacionId), id: e.id })),
    ...dups.map((d) => ({ ...aGuardada(d.nueva, d.importacionId), id: d.id })),
  ]
}

export async function ejecutarConsulta(c: Consulta): Promise<Registro[]> {
  const base = await registrosBase(c.campoFecha, c.unidad, c.incluirPendientes)
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

/** Filas guardadas que coinciden con la búsqueda libre y los filtros (evaluados sobre la fila aplanada). */
async function buscarFilas(q: string, filtros: Grupo | null): Promise<FilaGuardada[]> {
  let filas = await db.filas.toArray()
  if (q.trim())
    filas = filas.filter((f) =>
      coincideBusqueda([f.doc, f.archivo, ...Object.values(f.campos).map((v) => v.o)], q),
    )
  if (filtros && contarCondiciones(filtros)) {
    const [registros, tipoDe] = await Promise.all([
      registrosBase("fecha_registro", "filas"),
      tipoDeCampo(),
    ])
    const pasan = new Set(
      registros.filter((r) => evaluarFiltro(filtros, r, tipoDe)).map((r) => r.__id),
    )
    filas = filas.filter((f) => pasan.has(f.id))
  }
  return filas
}

function describirBusqueda(b: { q: string; filtros: Grupo | null }) {
  const partes = []
  if (b.q.trim()) partes.push(`búsqueda «${b.q.trim()}»`)
  const n = b.filtros ? contarCondiciones(b.filtros) : 0
  if (n) partes.push(`${n} ${n === 1 ? "filtro" : "filtros"}`)
  return partes.length ? `Todas las que coincidían con ${partes.join(" y ")}` : "Todas las filas guardadas"
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
  async listarFilas(token, q, p, filtros) {
    await usuarioDeToken(token)
    await esperar(120, 260)
    const filas = (await buscarFilas(q, filtros ?? null)).sort((a, b) =>
      (b.fechaRegistro ?? "").localeCompare(a.fechaRegistro ?? ""),
    )
    return {
      items: filas.slice((p.pagina - 1) * p.porPagina, p.pagina * p.porPagina),
      total: filas.length,
      pagina: p.pagina,
      porPagina: p.porPagina,
    }
  },
  async eliminarFilas(token, seleccion) {
    const u = await usuarioDeToken(token)
    await esperar(250, 500)
    const ids =
      "ids" in seleccion
        ? seleccion.ids
        : (await buscarFilas(seleccion.busqueda.q, seleccion.busqueda.filtros)).map((f) => f.id)
    if (!ids.length) return 0
    let eliminadas = 0
    await db.transaction("rw", [db.filas, db.pacientes], async () => {
      const filas = (await db.filas.bulkGet(ids)).filter((f): f is FilaGuardada => !!f)
      eliminadas = filas.length
      await db.filas.bulkDelete(filas.map((f) => f.id))
      // Un paciente sin filas restantes deja de existir: su ficha solo se arma desde las filas.
      const docs = [...new Set(filas.map((f) => f.doc).filter((d): d is string => !!d))]
      for (const doc of docs)
        if (!(await db.filas.where("doc").equals(doc).count())) await db.pacientes.delete(doc)
    })
    datosCambiaron()
    await registrarEvento(
      u,
      "datos",
      `Eliminó ${eliminadas} ${eliminadas === 1 ? "fila" : "filas"} de forma permanente`,
      "ids" in seleccion ? undefined : describirBusqueda(seleccion.busqueda),
    )
    return eliminadas
  },
  async usoColumnas(token) {
    await usuarioDeToken(token)
    await esperar(80, 180)
    const uso: Record<string, number> = {}
    await db.filas.each((f) => {
      for (const [k, v] of Object.entries(f.campos)) if (v.o) uso[k] = (uso[k] ?? 0) + 1
      if (f.doc) uso.documento = (uso.documento ?? 0) + 1
      if (f.fechaRegistro) uso.fecha_registro = (uso.fecha_registro ?? 0) + 1
      if (f.monto !== null) uso.monto = (uso.monto ?? 0) + 1
    })
    return uso
  },
  async eliminarColumna(token, clave) {
    const u = await exigirAdmin(token)
    await esperar(250, 500)
    if ((COLUMNAS_PROTEGIDAS as readonly string[]).includes(clave))
      throw error(
        ERRORES.validacion,
        "Esta columna identifica o fecha cada registro y no se puede eliminar.",
      )
    const catalogo = await catalogoCompleto()
    const col = catalogo.find((c) => c.clave === clave)
    if (!col) throw error(ERRORES.noEncontrado, "La columna ya no existe.")
    let filas = 0
    await db.transaction("rw", [db.filas, db.pacientes, db.columnas], async () => {
      await db.filas.toCollection().modify((f) => {
        if (!(clave in f.campos)) return
        if (f.campos[clave]?.o) filas++
        delete f.campos[clave]
      })
      await db.pacientes.toCollection().modify((pac) => {
        if (clave in pac.campos) delete pac.campos[clave]
      })
      if (col.origen === "extra") await db.columnas.delete(clave)
    })
    datosCambiaron()
    await registrarEvento(
      u,
      "datos",
      `Eliminó la columna «${col.etiqueta}» de forma permanente`,
      `${filas} ${filas === 1 ? "fila tenía" : "filas tenían"} valor`,
    )
    return { filas }
  },
  async filasConError(token) {
    await usuarioDeToken(token)
    await esperar(120, 260)
    return db.filasError.toArray()
  },
  async corregirFila(token, id, fila) {
    const u = await usuarioDeToken(token)
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
    await registrarEvento(
      u,
      "datos",
      resultado === "guardada" ? "Corrigió y guardó una fila" : "Corrigió una fila que resultó duplicada",
      describirFila(fila),
    )
    return resultado
  },
  async descartarFilaConError(token, id) {
    const u = await usuarioDeToken(token)
    await esperar()
    const reg = await db.filasError.get(id)
    await db.filasError.delete(id)
    datosCambiaron()
    if (reg) await registrarEvento(u, "datos", "Descartó una fila con error", describirFila(reg.fila))
  },
  async duplicadosPendientes(token) {
    await usuarioDeToken(token)
    await esperar(120, 260)
    return db.pendientes.toArray()
  },
  async resolverDuplicado(token, id, accion, combinada) {
    const u = await usuarioDeToken(token)
    await esperar()
    const p = await db.pendientes.get(id)
    if (!p) throw error(ERRORES.noEncontrado, "Este duplicado ya fue resuelto.")
    if (accion === "combinar") {
      if (!combinada)
        throw error(ERRORES.validacion, "Falta la fila combinada.")
      if (tieneErrores(combinada.fila))
        throw error(
          ERRORES.validacion,
          "La combinación elegida deja la fila con errores. Elija otros valores.",
        )
    }
    const reemplaza = accion === "conservar_nueva" || accion === "combinar"
    const aGuardar = accion === "combinar" ? combinada!.fila : p.nueva
    await db.transaction(
      "rw",
      [db.filas, db.pacientes, db.pendientes, db.importaciones],
      async () => {
        if (reemplaza && p.existenteId) {
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
            aGuardada(aGuardar, p.importacionId),
          )
        await db.pendientes.delete(id)
      },
    )
    datosCambiaron()
    const ACCIONES = {
      conservar_anterior: "conservó la versión guardada",
      conservar_nueva: "usó la versión nueva",
      guardar_ambas: "guardó ambas versiones",
      combinar: "combinó ambas versiones",
    }
    const anteriores = combinada
      ? Object.entries(combinada.combinacion)
          .filter(([, lado]) => lado === "anterior")
          .map(([c]) => c)
      : []
    await registrarEvento(
      u,
      "datos",
      `Resolvió un duplicado: ${ACCIONES[accion]}`,
      describirFila(p.nueva) +
        (anteriores.length ? ` · de la versión guardada: ${anteriores.join(", ")}` : ""),
    )
  },
  async pacientesIncompletos(token) {
    await usuarioDeToken(token)
    await esperar(150, 300)
    return (await db.pacientes.toArray())
      .map((p) => ({ ...p, faltantes: camposFaltantes(p) }))
      .filter((p) => p.faltantes.length > 0)
  },
  async actualizarPaciente(token, doc, campos) {
    const u = await usuarioDeToken(token)
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
    await registrarEvento(
      u,
      "datos",
      "Completó datos de un paciente",
      Object.keys(campos).filter((c) => campos[c].trim()).join(", "),
    )
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
