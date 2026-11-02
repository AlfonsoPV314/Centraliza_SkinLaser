// MS Auditoría simulado: los demás servicios simulados publican eventos aquí.
import type { AuditoriaApi, EventoAuditoria, TipoEvento } from "@/contracts/auditoria"
import { db } from "./db"
import { ahora, esperar, exigirAdmin, uid } from "./util"

export async function registrarEvento(
  usuario: { id: string; nombreUsuario: string } | null,
  tipo: TipoEvento,
  accion: string,
  detalle?: string,
): Promise<void> {
  const e: EventoAuditoria = {
    id: uid("ev-"),
    tipo,
    accion,
    detalle,
    usuarioId: usuario?.id ?? null,
    usuario: usuario?.nombreUsuario ?? "Sistema",
    creadoEn: ahora(),
  }
  // La auditoría nunca debe impedir la acción principal.
  await db.auditoria.put(e).catch(() => undefined)
}

export const auditoriaMock: AuditoriaApi = {
  async listar(token, tipo, p) {
    await esperar()
    await exigirAdmin(token)
    let todos = await db.auditoria.orderBy("creadoEn").reverse().toArray()
    if (tipo) todos = todos.filter((e) => e.tipo === tipo)
    const inicio = (p.pagina - 1) * p.porPagina
    return { items: todos.slice(inicio, inicio + p.porPagina), total: todos.length, ...p }
  },
}
