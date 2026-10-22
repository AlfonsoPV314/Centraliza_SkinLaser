import type { AuthApi, DatosRegistro, Sesion } from "@/contracts/auth"
import { ERRORES } from "@/contracts/comunes"
import { SESION } from "@/config/features"
import {
  celularValido,
  correoValido,
  enmascararCorreo,
  normalizarCorreo,
  normalizarTelefono,
} from "@/domain/contact"
import { db, type UsuarioRegistro } from "./db"
import { enviarMensaje } from "./notificaciones"
import {
  aUsuario,
  ahora,
  contrasenaSegura,
  enMinutos,
  error,
  esperar,
  hashContrasena,
  uid,
  usuarioDeToken,
} from "./util"
import { PREFERENCIAS_INICIALES } from "./seed"

const enlace = (ruta: string, token: string) =>
  `${location.origin}${location.pathname}#${ruta}?token=${token}`

async function crearSesion(u: UsuarioRegistro): Promise<Sesion> {
  const token = uid("s-")
  const expiraEn = enMinutos(SESION.minutosInactividad)
  await db.sesiones.put({ token, usuarioId: u.id, expiraEn })
  return { token, usuario: aUsuario(u), expiraEn }
}

export async function crearTokenContrasena(
  usuarioId: string,
  proposito: "recuperacion" | "confirmacion",
) {
  const token = uid("t-")
  await db.tokens.put({
    token,
    usuarioId,
    proposito,
    expiraEn: enMinutos(30),
    usado: false,
  })
  return token
}

export async function enviarEnlaceContrasena(
  u: UsuarioRegistro,
  proposito: "recuperacion" | "confirmacion",
) {
  const token = await crearTokenContrasena(u.id, proposito)
  const ruta =
    proposito === "recuperacion" ? "/restablecer" : "/cambiar-contrasena"
  await enviarMensaje({
    canal: "correo",
    destino: u.correo,
    asunto:
      proposito === "recuperacion"
        ? "Recupere su contraseña"
        : "Confirme el cambio de contraseña",
    cuerpo:
      proposito === "recuperacion"
        ? `Hola ${u.nombreUsuario}: recibimos una solicitud para restablecer su contraseña. El enlace vence en 30 minutos. Si no fue usted, ignore este mensaje.`
        : `Hola ${u.nombreUsuario}: para cambiar su contraseña abra el enlace e ingrese su contraseña actual y la nueva. Vence en 30 minutos.`,
    enlace: enlace(ruta, token),
  })
}

export const authMock: AuthApi = {
  async iniciarSesion(correo, contrasena) {
    await esperar(300, 600)
    const u = await db.usuarios
      .where("correo")
      .equals(normalizarCorreo(correo))
      .first()
    if (!u || (await hashContrasena(contrasena, u.sal)) !== u.hash) {
      throw error(
        ERRORES.noAutenticado,
        "El correo o la contraseña no coinciden. Revíselos e intente de nuevo.",
      )
    }
    if (!u.activo)
      throw error(
        { ...ERRORES.sinPermisos, estado: 423 },
        "Su cuenta está desactivada. Contacte al administrador del sistema.",
      )
    return crearSesion(u)
  },
  async sesionActual(token) {
    const u = await usuarioDeToken(token)
    const s = (await db.sesiones.get(token))!
    return { token, usuario: aUsuario(u), expiraEn: s.expiraEn }
  },
  async renovar(token) {
    const u = await usuarioDeToken(token)
    const expiraEn = enMinutos(SESION.minutosInactividad)
    await db.sesiones.update(token, { expiraEn })
    return { token, usuario: aUsuario(u), expiraEn }
  },
  async cerrarSesion(token) {
    await esperar(100, 250)
    await db.sesiones.delete(token)
  },
  async registrar(datos: DatosRegistro) {
    await esperar(400, 700)
    const correo = normalizarCorreo(datos.correo)
    if (!correoValido(correo))
      throw error(ERRORES.validacion, "El correo no tiene un formato válido.", {
        campo: "correo",
      })
    if (await db.usuarios.where("correo").equals(correo).count())
      throw error(ERRORES.conflicto, "Ya existe una cuenta con ese correo.", {
        campo: "correo",
      })
    if (!celularValido(datos.telefono))
      throw error(
        ERRORES.validacion,
        "El teléfono debe ser un celular chileno (+56 9 XXXX XXXX).",
        { campo: "telefono" },
      )
    if (!contrasenaSegura(datos.contrasena))
      throw error(
        ERRORES.validacion,
        "La contraseña no cumple los requisitos de seguridad.",
        { campo: "contrasena" },
      )
    const sal = uid()
    const u: UsuarioRegistro = {
      id: uid("u-"),
      nombreUsuario: datos.nombreUsuario.trim(),
      correo,
      telefono: normalizarTelefono(datos.telefono)!,
      rol: "usuario",
      activo: true,
      correoVerificado: false,
      creadoEn: ahora(),
      preferencias: { ...PREFERENCIAS_INICIALES },
      sal,
      hash: await hashContrasena(datos.contrasena, sal),
    }
    await db.usuarios.put(u)
    await enviarMensaje({
      canal: "correo",
      destino: correo,
      asunto: "Bienvenida: verifique su correo",
      cuerpo: `Hola ${u.nombreUsuario}: su cuenta fue creada. En producción, este correo incluiría un enlace de verificación y la cuenta requeriría aprobación del administrador.`,
    })
    return aUsuario(u)
  },
  async correoDisponible(correo) {
    await esperar(150, 300)
    return (
      (await db.usuarios
        .where("correo")
        .equals(normalizarCorreo(correo))
        .count()) === 0
    )
  },
  async solicitarRecuperacionContrasena(correo) {
    await esperar(400, 700)
    const u = await db.usuarios
      .where("correo")
      .equals(normalizarCorreo(correo))
      .first()
    if (u && u.activo) await enviarEnlaceContrasena(u, "recuperacion")
  },
  async recuperarCorreo(telefono, canal) {
    await esperar(400, 700)
    const n = normalizarTelefono(telefono)
    if (!n) return
    const usuarios = await db.usuarios.where("telefono").equals(n).toArray()
    for (const u of usuarios) {
      await enviarMensaje({
        canal,
        destino: n,
        asunto: "Su correo de acceso",
        cuerpo: `Su cuenta en el sistema está asociada al correo ${enmascararCorreo(u.correo)}.`,
      })
    }
  },
  async validarToken(token) {
    await esperar(150, 300)
    const t = await db.tokens.get(token)
    if (!t || t.usado)
      throw error(
        ERRORES.noEncontrado,
        "El enlace no es válido o ya fue usado. Solicite uno nuevo.",
      )
    if (t.expiraEn < ahora())
      throw error(
        { ...ERRORES.noEncontrado, estado: 410 },
        "El enlace expiró. Solicite uno nuevo.",
      )
    return { proposito: t.proposito, expiraEn: t.expiraEn }
  },
  async restablecerContrasena(token, nueva) {
    await esperar(300, 500)
    const t = await db.tokens.get(token)
    if (!t || t.usado || t.expiraEn < ahora() || t.proposito !== "recuperacion")
      throw error(
        { ...ERRORES.noEncontrado, estado: 410 },
        "El enlace expiró o ya fue usado. Solicite uno nuevo.",
      )
    if (!contrasenaSegura(nueva))
      throw error(
        ERRORES.validacion,
        "La contraseña no cumple los requisitos de seguridad.",
      )
    const sal = uid()
    await db.usuarios.update(t.usuarioId, {
      sal,
      hash: await hashContrasena(nueva, sal),
    })
    await db.tokens.update(token, { usado: true })
    await db.sesiones.where("usuarioId").equals(t.usuarioId).delete()
  },
  async cambiarContrasena(tokenSesion, tokenConfirmacion, actual, nueva) {
    await esperar(300, 500)
    const u = await usuarioDeToken(tokenSesion)
    const t = await db.tokens.get(tokenConfirmacion)
    if (!t || t.usado || t.expiraEn < ahora() || t.usuarioId !== u.id)
      throw error(
        { ...ERRORES.noEncontrado, estado: 410 },
        "El enlace de confirmación expiró o no corresponde a su cuenta. Solicite uno nuevo desde su perfil.",
      )
    if ((await hashContrasena(actual, u.sal)) !== u.hash)
      throw error(ERRORES.validacion, "La contraseña actual no es correcta.", {
        campo: "actual",
      })
    if (!contrasenaSegura(nueva))
      throw error(
        ERRORES.validacion,
        "La nueva contraseña no cumple los requisitos de seguridad.",
        { campo: "nueva" },
      )
    const sal = uid()
    await db.usuarios.update(u.id, {
      sal,
      hash: await hashContrasena(nueva, sal),
    })
    await db.tokens.update(tokenConfirmacion, { usado: true })
  },
}
