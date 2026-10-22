// Persistencia del backend simulado en IndexedDB (Dexie).
import Dexie, { type Table } from "dexie"
import type { ColumnaCatalogo, FilaGuardada, Paciente } from "@/domain/model"
import type { Plantilla } from "@/domain/templates"
import type { Usuario } from "@/contracts/usuarios"
import type { Mensaje } from "@/contracts/notificaciones"
import type { Importacion } from "@/contracts/ingesta"
import type { DuplicadoPendiente, FilaConError } from "@/contracts/datos"

export interface UsuarioRegistro extends Usuario {
  hash: string
  sal: string
}
export interface SesionRegistro {
  token: string
  usuarioId: string
  expiraEn: string
}
export interface TokenRegistro {
  token: string
  usuarioId: string
  proposito: "recuperacion" | "confirmacion"
  expiraEn: string
  usado: boolean
}
export interface SolicitudRegistro {
  id: string
  usuarioId: string
  tipo: "correo" | "telefono"
  nuevoValor: string
  codigo: string
  canal: "sms" | "whatsapp" | "correo"
  destino: string
  expiraEn: string
  reenviarDesde: string
  intentos: number
}
export interface ImportacionRegistro
  extends Omit<Importacion, "sePuedeDeshacer"> {
  insertadas: string[]
  reemplazadas: FilaGuardada[]
  pacientesPrevios: { doc: string; previo: Paciente | null }[]
}
export interface Ajuste {
  clave: string
  valor: unknown
}

class BaseDatosPrototipo extends Dexie {
  usuarios!: Table<UsuarioRegistro, string>
  sesiones!: Table<SesionRegistro, string>
  tokens!: Table<TokenRegistro, string>
  solicitudes!: Table<SolicitudRegistro, string>
  mensajes!: Table<Mensaje, string>
  filas!: Table<FilaGuardada, string>
  pacientes!: Table<Paciente, string>
  columnas!: Table<ColumnaCatalogo, string>
  importaciones!: Table<ImportacionRegistro, string>
  filasError!: Table<FilaConError, string>
  pendientes!: Table<DuplicadoPendiente, string>
  plantillas!: Table<Plantilla, string>
  ajustes!: Table<Ajuste, string>

  constructor() {
    super("centraliza-prototipo")
    this.version(1).stores({
      usuarios: "id, &correo, telefono",
      sesiones: "token, usuarioId",
      tokens: "token, usuarioId",
      solicitudes: "id, usuarioId",
      mensajes: "id, creadoEn",
      filas: "id, importacionId, doc, claveDup, fechaRegistro",
      pacientes: "doc",
      columnas: "clave",
      importaciones: "id, creadaEn, estado",
      filasError: "id, importacionId",
      pendientes: "id, importacionId",
      plantillas: "id, nombre, actualizadaEn, eliminadaEn",
      ajustes: "clave",
    })
  }
}

export const db = new BaseDatosPrototipo()

/** Contador de versión de los datos: invalida cachés de consultas. */
let version = 0
export const versionDatos = () => version
export const datosCambiaron = () => {
  version++
}
