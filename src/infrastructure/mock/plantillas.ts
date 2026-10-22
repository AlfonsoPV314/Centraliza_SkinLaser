import type { PlantillasApi } from "@/contracts/plantillas"
import { ERRORES } from "@/contracts/comunes"
import { camposDeFiltro } from "@/domain/filters"
import { camposActivos, tipoSalida, type Plantilla } from "@/domain/templates"
import { normalizarTexto } from "@/domain/text"
import { db } from "./db"
import { ahora, error, esperar, uid, usuarioDeToken } from "./util"

const vigentes = async () =>
  (await db.plantillas.toArray()).filter((p) => !p.eliminadaEn)

async function nombreLibre(nombre: string, excepto?: string) {
  const n = normalizarTexto(nombre)
  return !(await vigentes()).some(
    (p) => p.id !== excepto && normalizarTexto(p.nombre) === n,
  )
}

export const plantillasMock: PlantillasApi = {
  async listar(token, f) {
    await usuarioDeToken(token)
    await esperar(200, 450)
    const q = normalizarTexto(f.q)
    let lista = (await vigentes()).filter((p) => {
      if (q && !normalizarTexto(`${p.nombre} ${p.descripcion}`).includes(q))
        return false
      if (f.tipo !== "todos" && tipoSalida(p) !== f.tipo) return false
      if (
        f.campo &&
        !camposActivos(p).includes(f.campo) &&
        !camposDeFiltro(p.filtros).includes(f.campo)
      )
        return false
      return true
    })
    lista = lista.sort((a, b) => {
      if (f.orden === "nombre") return a.nombre.localeCompare(b.nombre, "es")
      if (f.orden === "mas_usadas") return b.uso.veces - a.uso.veces
      return b.actualizadaEn.localeCompare(a.actualizadaEn)
    })
    const pagina = Math.max(
      1,
      Math.min(f.pagina, Math.ceil(lista.length / f.porPagina) || 1),
    )
    return {
      items: lista.slice((pagina - 1) * f.porPagina, pagina * f.porPagina),
      total: lista.length,
      pagina,
      porPagina: f.porPagina,
    }
  },
  async obtener(token, id) {
    await usuarioDeToken(token)
    await esperar(80, 200)
    const p = await db.plantillas.get(id)
    if (!p || p.eliminadaEn)
      throw error(
        ERRORES.noEncontrado,
        "La plantilla no existe o fue eliminada.",
      )
    return p
  },
  async crear(token, datos) {
    await usuarioDeToken(token)
    await esperar(300, 600)
    if (!datos.nombre.trim())
      throw error(ERRORES.validacion, "La plantilla necesita un nombre.", {
        campo: "nombre",
      })
    if (!(await nombreLibre(datos.nombre)))
      throw error(
        ERRORES.conflicto,
        "Ya existe una plantilla con ese nombre. Elija otro.",
        { campo: "nombre" },
      )
    const p: Plantilla = {
      ...datos,
      id: uid("pl-"),
      uso: { veces: 0, ultimoUso: null },
      creadaEn: ahora(),
      actualizadaEn: ahora(),
      eliminadaEn: null,
    }
    await db.plantillas.put(p)
    return p
  },
  async actualizar(token, id, datos) {
    await usuarioDeToken(token)
    await esperar(300, 600)
    const anterior = await db.plantillas.get(id)
    if (!anterior)
      throw error(ERRORES.noEncontrado, "La plantilla ya no existe.")
    if (!(await nombreLibre(datos.nombre, id)))
      throw error(
        ERRORES.conflicto,
        "Ya existe otra plantilla con ese nombre.",
        { campo: "nombre" },
      )
    const actual: Plantilla = { ...anterior, ...datos, actualizadaEn: ahora() }
    await db.plantillas.put(actual)
    return { actual, anterior }
  },
  async eliminar(token, ids) {
    await usuarioDeToken(token)
    await esperar(250, 450)
    const marca = ahora()
    await db.plantillas
      .where("id")
      .anyOf(ids)
      .modify((p) => {
        p.eliminadaEn = marca
      })
  },
  async restaurar(token, ids) {
    await usuarioDeToken(token)
    await esperar(150, 300)
    await db.plantillas
      .where("id")
      .anyOf(ids)
      .modify((p) => {
        p.eliminadaEn = null
      })
  },
  async registrarUso(token, id) {
    await usuarioDeToken(token)
    const p = await db.plantillas.get(id)
    if (p)
      await db.plantillas.put({
        ...p,
        uso: { veces: p.uso.veces + 1, ultimoUso: ahora() },
      })
  },
  async resumen(token) {
    await usuarioDeToken(token)
    await esperar(150, 300)
    const l = await vigentes()
    return {
      total: l.length,
      masUsadas: [...l]
        .filter((p) => p.uso.veces > 0)
        .sort((a, b) => b.uso.veces - a.uso.veces)
        .slice(0, 4),
      recientes: [...l]
        .sort((a, b) => b.actualizadaEn.localeCompare(a.actualizadaEn))
        .slice(0, 4),
    }
  },
}
