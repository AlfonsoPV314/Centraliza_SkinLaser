import type { UsuariosApi, SolicitudVerificacion } from "@/contracts/usuarios"
import { ERRORES } from "@/contracts/comunes"
import {
  celularValido,
  correoValido,
  enmascararCorreo,
  enmascararTelefono,
  normalizarCorreo,
  normalizarTelefono,
} from "@/domain/contact"
import { normalizarTexto } from "@/domain/text"
import { db, type SolicitudRegistro, type UsuarioRegistro } from "./db"
import { enviarMensaje } from "./notificaciones"
import { enviarEnlaceContrasena } from "./auth"
import { PREFERENCIAS_INICIALES } from "./seed"
import {
  aUsuario,
  ahora,
  codigoAleatorio,
  enMinutos,
  error,
  esperar,
  exigirAdmin,
  hashContrasena,
  uid,
  usuarioDeToken,
} from "./util"

const VIGENCIA_CODIGO_MIN = 5
const ESPERA_REENVIO_S = 30

const aSolicitud = (s: SolicitudRegistro): SolicitudVerificacion => ({
  solicitudId: s.id,
  destinoEnmascarado:
    s.canal === "correo"
      ? enmascararCorreo(s.destino)
      : enmascararTelefono(s.destino),
  canal: s.canal,
  expiraEn: s.expiraEn,
  reenviarDesde: s.reenviarDesde,
})

async function enviarCodigo(s: SolicitudRegistro) {
  const texto =
    s.tipo === "correo"
      ? "confirmar el cambio de su correo"
      : "confirmar el cambio de su teléfono"
  await enviarMensaje({
    canal: s.canal,
    destino: s.destino,
    asunto: "Código de verificación",
    cuerpo: `Su código para ${texto} es ${s.codigo}. Vence en ${VIGENCIA_CODIGO_MIN} minutos. No lo comparta con nadie.`,
    codigo: s.codigo,
  })
}

async function correoLibre(correo: string, excepto?: string) {
  const u = await db.usuarios.where("correo").equals(correo).first()
  return !u || u.id === excepto
}

export const usuariosMock: UsuariosApi = {
  async listar(token, q, p) {
    await exigirAdmin(token)
    await esperar()
    const nq = normalizarTexto(q)
    const todos = (await db.usuarios.toArray())
      .filter(
        (u) =>
          !nq ||
          normalizarTexto(
            `${u.nombreUsuario} ${u.correo} ${u.telefono}`,
          ).includes(nq),
      )
      .sort((a, b) => a.nombreUsuario.localeCompare(b.nombreUsuario, "es"))
    return {
      items: todos
        .slice((p.pagina - 1) * p.porPagina, p.pagina * p.porPagina)
        .map(aUsuario),
      total: todos.length,
      pagina: p.pagina,
      porPagina: p.porPagina,
    }
  },
  async crear(token, datos) {
    await exigirAdmin(token)
    await esperar()
    const correo = normalizarCorreo(datos.correo)
    if (!correoValido(correo))
      throw error(ERRORES.validacion, "El correo no tiene un formato válido.", {
        campo: "correo",
      })
    if (!(await correoLibre(correo)))
      throw error(ERRORES.conflicto, "Ya existe una cuenta con ese correo.", {
        campo: "correo",
      })
    if (!celularValido(datos.telefono))
      throw error(
        ERRORES.validacion,
        "El teléfono debe ser un celular chileno (+56 9 XXXX XXXX).",
        { campo: "telefono" },
      )
    const sal = uid()
    const u: UsuarioRegistro = {
      id: uid("u-"),
      nombreUsuario: datos.nombreUsuario.trim(),
      correo,
      telefono: normalizarTelefono(datos.telefono)!,
      rol: datos.rol,
      activo: true,
      correoVerificado: false,
      creadoEn: ahora(),
      preferencias: { ...PREFERENCIAS_INICIALES },
      sal,
      hash: await hashContrasena(datos.contrasenaTemporal, sal),
    }
    await db.usuarios.put(u)
    await enviarMensaje({
      canal: "correo",
      destino: correo,
      asunto: "Invitación al sistema",
      cuerpo: `Hola ${u.nombreUsuario}: un administrador creó su cuenta. Su contraseña temporal es ${datos.contrasenaTemporal}; cámbiela al ingresar.`,
    })
    return aUsuario(u)
  },
  async actualizar(token, id, cambios) {
    const admin = await exigirAdmin(token)
    await esperar()
    const u = await db.usuarios.get(id)
    if (!u) throw error(ERRORES.noEncontrado, "El usuario ya no existe.")
    if (
      id === admin.id &&
      (cambios.activo === false || cambios.rol === "usuario")
    )
      throw error(
        ERRORES.conflicto,
        "No puede desactivarse ni quitarse el rol de administrador a sí mismo.",
      )
    const patch: Partial<UsuarioRegistro> = { ...cambios }
    if (cambios.correo) {
      patch.correo = normalizarCorreo(cambios.correo)
      if (!correoValido(patch.correo))
        throw error(
          ERRORES.validacion,
          "El correo no tiene un formato válido.",
          { campo: "correo" },
        )
      if (!(await correoLibre(patch.correo, id)))
        throw error(ERRORES.conflicto, "Ya existe una cuenta con ese correo.", {
          campo: "correo",
        })
    }
    if (cambios.telefono) {
      if (!celularValido(cambios.telefono))
        throw error(
          ERRORES.validacion,
          "El teléfono debe ser un celular chileno (+56 9 XXXX XXXX).",
          { campo: "telefono" },
        )
      patch.telefono = normalizarTelefono(cambios.telefono)!
    }
    await db.usuarios.update(id, patch)
    if (cambios.activo === false)
      await db.sesiones.where("usuarioId").equals(id).delete()
    return aUsuario((await db.usuarios.get(id))!)
  },
  async eliminar(token, id) {
    const admin = await exigirAdmin(token)
    await esperar()
    if (id === admin.id)
      throw error(ERRORES.conflicto, "No puede eliminar su propia cuenta.")
    await db.usuarios.delete(id)
    await db.sesiones.where("usuarioId").equals(id).delete()
  },
  async actualizarPerfil(token, cambios) {
    const u = await usuarioDeToken(token)
    await esperar()
    if (cambios.nombreUsuario !== undefined) {
      if (cambios.nombreUsuario.trim().length < 3)
        throw error(
          ERRORES.validacion,
          "El nombre de usuario debe tener al menos 3 caracteres.",
          { campo: "nombreUsuario" },
        )
      await db.usuarios.update(u.id, {
        nombreUsuario: cambios.nombreUsuario.trim(),
      })
    }
    return aUsuario((await db.usuarios.get(u.id))!)
  },
  async guardarPreferencias(token, preferencias) {
    const u = await usuarioDeToken(token)
    await db.usuarios.update(u.id, { preferencias })
    return aUsuario((await db.usuarios.get(u.id))!)
  },
  async solicitarEnlaceContrasena(token, modo) {
    const u = await usuarioDeToken(token)
    await esperar(400, 700)
    await enviarEnlaceContrasena(u, modo)
  },
  async solicitarCambioCorreo(token, nuevoCorreo, canal) {
    const u = await usuarioDeToken(token)
    await esperar(400, 700)
    const correo = normalizarCorreo(nuevoCorreo)
    if (!correoValido(correo))
      throw error(
        ERRORES.validacion,
        "El nuevo correo no tiene un formato válido.",
        { campo: "correo" },
      )
    if (correo === u.correo)
      throw error(ERRORES.validacion, "El nuevo correo es igual al actual.", {
        campo: "correo",
      })
    if (!(await correoLibre(correo, u.id)))
      throw error(
        ERRORES.conflicto,
        "Ese correo ya está en uso por otra cuenta.",
        { campo: "correo" },
      )
    const s: SolicitudRegistro = {
      id: uid("v-"),
      usuarioId: u.id,
      tipo: "correo",
      nuevoValor: correo,
      codigo: codigoAleatorio(),
      canal,
      destino: u.telefono,
      expiraEn: enMinutos(VIGENCIA_CODIGO_MIN),
      reenviarDesde: new Date(
        Date.now() + ESPERA_REENVIO_S * 1000,
      ).toISOString(),
      intentos: 0,
    }
    await db.solicitudes.put(s)
    await enviarCodigo(s)
    return aSolicitud(s)
  },
  async solicitarCambioTelefono(token, nuevoTelefono) {
    const u = await usuarioDeToken(token)
    await esperar(400, 700)
    if (!celularValido(nuevoTelefono))
      throw error(
        ERRORES.validacion,
        "El teléfono debe ser un celular chileno (+56 9 XXXX XXXX).",
        { campo: "telefono" },
      )
    const tel = normalizarTelefono(nuevoTelefono)!
    if (tel === u.telefono)
      throw error(ERRORES.validacion, "El nuevo teléfono es igual al actual.", {
        campo: "telefono",
      })
    const s: SolicitudRegistro = {
      id: uid("v-"),
      usuarioId: u.id,
      tipo: "telefono",
      nuevoValor: tel,
      codigo: codigoAleatorio(),
      canal: "correo",
      destino: u.correo,
      expiraEn: enMinutos(VIGENCIA_CODIGO_MIN),
      reenviarDesde: new Date(
        Date.now() + ESPERA_REENVIO_S * 1000,
      ).toISOString(),
      intentos: 0,
    }
    await db.solicitudes.put(s)
    await enviarCodigo(s)
    return aSolicitud(s)
  },
  async reenviarCodigo(token, solicitudId) {
    const u = await usuarioDeToken(token)
    await esperar()
    const s = await db.solicitudes.get(solicitudId)
    if (!s || s.usuarioId !== u.id)
      throw error(
        ERRORES.noEncontrado,
        "La solicitud ya no existe. Comience de nuevo.",
      )
    if (s.reenviarDesde > ahora())
      throw error(
        ERRORES.limite,
        "Espere unos segundos antes de pedir otro código.",
      )
    const nueva = {
      ...s,
      codigo: codigoAleatorio(),
      expiraEn: enMinutos(VIGENCIA_CODIGO_MIN),
      reenviarDesde: new Date(
        Date.now() + ESPERA_REENVIO_S * 1000,
      ).toISOString(),
      intentos: 0,
    }
    await db.solicitudes.put(nueva)
    await enviarCodigo(nueva)
    return aSolicitud(nueva)
  },
  async confirmarCodigo(token, solicitudId, codigo) {
    const u = await usuarioDeToken(token)
    await esperar(300, 500)
    const s = await db.solicitudes.get(solicitudId)
    if (!s || s.usuarioId !== u.id)
      throw error(
        ERRORES.noEncontrado,
        "La solicitud ya no existe. Comience de nuevo.",
      )
    if (s.expiraEn < ahora())
      throw error(
        { ...ERRORES.validacion, tipo: "codigo-expirado", estado: 410 },
        "El código expiró. Pida uno nuevo con «Reenviar código».",
      )
    if (s.intentos >= 5)
      throw error(ERRORES.limite, "Demasiados intentos. Pida un código nuevo.")
    if (s.codigo !== codigo.trim()) {
      await db.solicitudes.update(s.id, { intentos: s.intentos + 1 })
      throw error(
        { ...ERRORES.validacion, tipo: "codigo-incorrecto" },
        `El código no es correcto. Le quedan ${4 - s.intentos} intentos.`,
      )
    }
    if (s.tipo === "correo")
      await db.usuarios.update(u.id, {
        correo: s.nuevoValor,
        correoVerificado: true,
      })
    else await db.usuarios.update(u.id, { telefono: s.nuevoValor })
    await db.solicitudes.delete(s.id)
    return aUsuario((await db.usuarios.get(u.id))!)
  },
}
