import type { IngestaApi, Importacion } from "@/contracts/ingesta"
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
})

export const ingestaMock: IngestaApi = {
  async confirmar(token, p) {
    const u = await usuarioDeToken(token)
    await esperar(500, 900)
    const id = uid("imp-")
    const creadaEn = ahora()
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
      ],
      async () => {
        for (const f of p.insertar) nuevas.push(aGuardada(f, id))
        conteos.nuevas = p.insertar.length
        for (const d of p.decisiones) {
          if (d.accion === "conservar_anterior") conteos.descartadas++
          else if (d.accion === "guardar_ambas") {
            nuevas.push(aGuardada(d.nueva, id))
            conteos.ambas++
          } else if (d.accion === "conservar_nueva") {
            if (d.existenteId) {
              const anterior = await db.filas.get(d.existenteId)
              if (anterior) {
                reemplazadas.push(anterior)
                await db.filas.delete(anterior.id)
              }
            }
            nuevas.push(aGuardada(d.nueva, id))
            conteos.reemplazadas++
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
    await usuarioDeToken(token)
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
  },
}
