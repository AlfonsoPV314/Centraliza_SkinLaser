import type { IngestaApi, Importacion } from "@/contracts/ingesta"
import { normalizarTexto } from "@/domain/text"
import { registrarEvento } from "./auditoria"
import { ERRORES } from "@/contracts/comunes"
import type { FilaGuardada, Paciente } from "@/domain/model"
import { db, datosCambiaron, type ImportacionRegistro } from "./db"
import { aGuardada, guardarFilas } from "./persistencia"
import { ahora, error, esperar, uid, usuarioDeToken } from "./util"

async function ultimaActiva() {
  return (
    await db.importaciones.where("estado").equals("activa").sortBy("creadaEn")
  ).pop()
}

const aImportacion = (
  r: ImportacionRegistro,
  ultimaId?: string,
): Importacion => ({
  id: r.id,
  creadaEn: r.creadaEn,
  usuario: r.usuario,
  archivos: r.archivos,
  conteos: r.conteos,
  estado: r.estado,
  sePuedeDeshacer: r.estado === "activa" && r.id === ultimaId,
  originales: r.originales ?? [],
})

const CLAVE_IGNORADAS = "columnas-ignoradas"

async function leerIgnoradas(): Promise<string[]> {
  const v = (await db.ajustes.get(CLAVE_IGNORADAS))?.valor
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
}

async function huella(contenido: Blob): Promise<string> {
  if (!crypto?.subtle) return ""
  const h = await crypto.subtle.digest("SHA-256", await contenido.arrayBuffer())
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("")
}

export const ingestaMock: IngestaApi = {
  async confirmar(token, p, originales = []) {
    const u = await usuarioDeToken(token)
    await esperar(500, 900)
    const id = uid("imp-")
    const creadaEn = ahora()
    // Las huellas se calculan fuera de la transacción: IndexedDB la cierra si espera trabajo ajeno.
    const archivos = await Promise.all(
      originales.map(async (a) => ({
        id: uid("doc-"),
        importacionId: id,
        nombre: a.nombre,
        tipo: a.contenido.type || "application/octet-stream",
        tamano: a.contenido.size,
        sha256: await huella(a.contenido),
        contenido: a.contenido,
        subidoEn: creadaEn,
      })),
    )
    const previos = new Map<string, Paciente | null>()
    const nuevas: FilaGuardada[] = []
    const reemplazadas: FilaGuardada[] = []
    const conteos = {
      nuevas: 0,
      reemplazadas: 0,
      ambas: 0,
      descartadas: 0,
      conError: p.conError.length,
      pendientes: 0,
      combinadas: 0,
    }

    await db.transaction(
      "rw",
      [
        db.filas,
        db.pacientes,
        db.columnas,
        db.importaciones,
        db.filasError,
        db.pendientes,
        db.archivos,
      ],
      async () => {
        if (archivos.length) await db.archivos.bulkPut(archivos)
        for (const f of p.insertar) nuevas.push(aGuardada(f, id))
        conteos.nuevas = p.insertar.length
        for (const d of p.decisiones) {
          if (d.accion === "conservar_anterior") conteos.descartadas++
          else if (d.accion === "guardar_ambas") {
            nuevas.push(aGuardada(d.nueva, id))
            conteos.ambas++
          } else if (d.accion === "conservar_nueva" || d.accion === "combinar") {
            if (d.existenteId) {
              const anterior = await db.filas.get(d.existenteId)
              if (anterior) {
                reemplazadas.push(anterior)
                await db.filas.delete(anterior.id)
              }
            }
            nuevas.push(aGuardada(d.nueva, id))
            if (d.accion === "combinar") conteos.combinadas++
            else conteos.reemplazadas++
          } else {
            await db.pendientes.put({
              id: uid("p-"),
              importacionId: id,
              nueva: d.nueva,
              existenteId: d.existenteId,
              existente: d.existente,
              creadaEn,
            })
            conteos.pendientes++
          }
        }
        await guardarFilas(nuevas, previos)
        await db.filasError.bulkPut(
          p.conError.map((fila) => ({
            id: uid("e-"),
            importacionId: id,
            fila,
            creadaEn,
          })),
        )
        for (const c of p.columnasExtra) {
          if (!(await db.columnas.get(c.clave)))
            await db.columnas.put({ ...c, base: false, origen: "extra" })
        }
        await db.importaciones.put({
          id,
          creadaEn,
          usuario: u.nombreUsuario,
          archivos: p.archivos,
          conteos,
          estado: "activa",
          originales: archivos.map((a) => a.nombre),
          insertadas: nuevas.map((f) => f.id),
          reemplazadas,
          pacientesPrevios: [...previos].map(([doc, previo]) => ({
            doc,
            previo,
          })),
        })
      },
    )
    datosCambiaron()
    await registrarEvento(
      u,
      "importacion",
      "Confirmó una importación",
      `${p.archivos.map((a) => a.nombre).join(", ")} · ${conteos.nuevas} nuevas, ${conteos.conError} con error, ${conteos.pendientes} duplicados pendientes`,
    )
    const r = (await db.importaciones.get(id))!
    return aImportacion(r, id)
  },

  async listar(token, limite = 10) {
    await usuarioDeToken(token)
    await esperar(100, 250)
    const ultima = await ultimaActiva()
    const todas = await db.importaciones
      .orderBy("creadaEn")
      .reverse()
      .limit(limite)
      .toArray()
    return todas.map((r) => aImportacion(r, ultima?.id))
  },

  async deshacer(token, id) {
    const u = await usuarioDeToken(token)
    await esperar(400, 700)
    const imp = await db.importaciones.get(id)
    if (!imp || imp.estado === "deshecha")
      throw error(ERRORES.noEncontrado, "Esta importación ya fue deshecha.")
    const ultima = await ultimaActiva()
    if (ultima && ultima.id !== id) {
      throw error(
        ERRORES.conflicto,
        `Primero deshaga la importación más reciente (${ultima.archivos.map((a) => a.nombre).join(", ")}). Las importaciones se deshacen en orden inverso para no mezclar datos.`,
      )
    }
    await db.transaction(
      "rw",
      [db.filas, db.pacientes, db.importaciones, db.filasError, db.pendientes],
      async () => {
        await db.filas.bulkDelete(imp.insertadas)
        if (imp.reemplazadas.length) await db.filas.bulkPut(imp.reemplazadas)
        for (const { doc, previo } of imp.pacientesPrevios) {
          if (previo) await db.pacientes.put(previo)
          else await db.pacientes.delete(doc)
        }
        await db.filasError.where("importacionId").equals(id).delete()
        await db.pendientes.where("importacionId").equals(id).delete()
        await db.importaciones.update(id, { estado: "deshecha" })
      },
    )
    datosCambiaron()
    await registrarEvento(
      u,
      "deshacer",
      "Deshizo una importación",
      imp.archivos.map((a) => a.nombre).join(", "),
    )
  },

  async descargarOriginal(token, importacionId, nombre) {
    await usuarioDeToken(token)
    await esperar(80, 200)
    const a = (await db.archivos.where("importacionId").equals(importacionId).toArray()).find(
      (x) => x.nombre === nombre,
    )
    if (!a) throw error(ERRORES.noEncontrado, `No se guardó el archivo original «${nombre}».`)
    return { nombre: a.nombre, contenido: a.contenido }
  },

  async columnasIgnoradas(token) {
    await usuarioDeToken(token)
    return leerIgnoradas()
  },

  async fijarColumnasIgnoradas(token, encabezados) {
    const u = await usuarioDeToken(token)
    await esperar(80, 200)
    const previas = await leerIgnoradas()
    // Una entrada por encabezado normalizado; se guarda el texto tal como lo escribió el usuario.
    const vistas = new Map<string, string>()
    for (const e of encabezados) {
      const t = e.trim()
      const k = normalizarTexto(t)
      if (k && !vistas.has(k)) vistas.set(k, t.slice(0, 120))
    }
    const lista = [...vistas.values()].sort((a, b) => a.localeCompare(b, "es"))
    await db.ajustes.put({ clave: CLAVE_IGNORADAS, valor: lista })
    const agregadas = lista.filter((x) => !previas.includes(x))
    const quitadas = previas.filter((x) => !lista.includes(x))
    await registrarEvento(
      u,
      "configuracion",
      "Cambió las columnas que siempre se ignoran",
      [
        agregadas.length && `ignora: ${agregadas.join(", ")}`,
        quitadas.length && `vuelve a importar: ${quitadas.join(", ")}`,
      ]
        .filter(Boolean)
        .join(" · "),
    )
    return lista
  },
}
