// Datos de demostración del prototipo. Generación determinista (misma semilla → mismos datos).
// No importar auth ni usuarios desde aquí: ambos dependen de este módulo.
import type { Preferencias } from "@/contracts/usuarios"
import type { FilaGuardada, FilaProcesada, Paciente } from "@/domain/model"
import { procesarFila, tieneErrores } from "@/domain/rules"
import { calcularDV } from "@/domain/run"
import { grupoVacio, nuevoId } from "@/domain/filters"
import { TEXTO_PROSA_PREDETERMINADO } from "@/domain/prose"
import type { Plantilla } from "@/domain/templates"
import { db, datosCambiaron, type UsuarioRegistro } from "./db"
import { aGuardada, guardarFilas } from "./persistencia"
import { hashContrasena, uid } from "./util"

export const PREFERENCIAS_INICIALES: Preferencias = {
  tema: "oscuro",
  porPagina: 12,
  vistaPlantillas: "tarjetas",
  carpetaDescarga: null,
}

export const CUENTAS_DEMO = [
  {
    correo: "admin@skinlaser.cl",
    contrasena: "SkinLaser#2025",
    rol: "administrador" as const,
    nombreUsuario: "Fabricio Guaya",
    telefono: "+56987654321",
  },
  {
    correo: "usuario@skinlaser.cl",
    contrasena: "SkinLaser#2025",
    rol: "usuario" as const,
    nombreUsuario: "Matías Rojas",
    telefono: "+56912345678",
  },
]

const VERSION_SEMILLA = 2

function prng(semilla: number) {
  let a = semilla
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const NOMBRES = [
  "Camila",
  "Valentina",
  "Sofía",
  "Isidora",
  "Antonia",
  "Fernanda",
  "Javiera",
  "Catalina",
  "Constanza",
  "Francisca",
  "Benjamín",
  "Vicente",
  "Martín",
  "Matías",
  "Joaquín",
  "Agustín",
  "Tomás",
  "Cristóbal",
  "Sebastián",
  "Diego",
  "María José",
  "Juan Pablo",
  "Rosa",
  "Luis",
  "Patricia",
  "Jorge",
]
const APELLIDOS = [
  "González",
  "Muñoz",
  "Rojas",
  "Díaz",
  "Pérez",
  "Soto",
  "Contreras",
  "Silva",
  "Martínez",
  "Sepúlveda",
  "Morales",
  "Rodríguez",
  "López",
  "Fuentes",
  "Hernández",
  "Torres",
  "Araya",
  "Flores",
  "Espinoza",
  "Valenzuela",
  "Castillo",
  "Tapia",
  "Reyes",
  "Gutiérrez",
  "Castro",
  "Pizarro",
  "Álvarez",
  "Vásquez",
]
const PREVISIONES = [
  "Fonasa A",
  "Fonasa B",
  "Fonasa C",
  "Fonasa D",
  "Isapre Banmédica",
  "Isapre Colmena",
  "Isapre Consalud",
  "Isapre Cruz Blanca",
  "Isapre Vida Tres",
  "Particular",
]
const SEGUROS = [
  "Sin seguro",
  "MetLife",
  "BICE Vida",
  "Consorcio",
  "Sura",
  "Chilena Consolidada",
]
const COMUNAS = [
  "Providencia",
  "Ñuñoa",
  "Las Condes",
  "Santiago",
  "La Florida",
  "Maipú",
  "Vitacura",
  "Puente Alto",
  "San Miguel",
  "La Reina",
]
const CALLES = [
  "Av. Providencia",
  "Irarrázaval",
  "Av. Apoquindo",
  "Los Leones",
  "Av. Vicuña Mackenna",
  "Pedro de Valdivia",
  "Av. Grecia",
  "Manuel Montt",
  "Av. Departamental",
  "Gran Avenida",
]
const PROFESIONALES = [
  "Dra. Paula Contreras",
  "Dr. Andrés Valdés",
  "Dra. Ignacia Morales",
  "Dr. Felipe Navarro",
  "Klgo. Rodrigo Saavedra",
  "Nut. Daniela Ortiz",
]
const CONCEPTOS: [string, number][] = [
  ["Consulta médica", 35000],
  ["Control", 25000],
  ["Ecografía", 48000],
  ["Kinesiología (sesión)", 22000],
  ["Evaluación nutricional", 30000],
  ["Procedimiento menor", 65000],
  ["Electrocardiograma", 28000],
]
const MEDIOS = [
  "Débito",
  "Crédito",
  "Efectivo",
  "Transferencia",
  "Bono Fonasa",
  "Reembolso Isapre",
]

const pad = (n: number) => String(n).padStart(2, "0")
const quitarTildes = (s: string) =>
  s.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "")

interface PersonaDemo {
  documento: string
  nombre_completo: string
  fecha_nacimiento: string
  prevision?: string
  direccion?: string
  email?: string
  seguro?: string
  telefono: string
}

function generarPersonas(r: () => number, n: number): PersonaDemo[] {
  const elegir = <T>(l: T[]) => l[Math.floor(r() * l.length)]
  const usados = new Set<number>()
  const personas: PersonaDemo[] = []
  for (let i = 0; i < n; i++) {
    let cuerpo = 0
    do cuerpo = 6_000_000 + Math.floor(r() * 20_000_000)
    while (usados.has(cuerpo))
    usados.add(cuerpo)
    const esPasaporte = r() < 0.04
    const nombre = elegir(NOMBRES)
    const ap1 = elegir(APELLIDOS)
    const ap2 = elegir(APELLIDOS)
    const anio = 1945 + Math.floor(r() * 62)
    const incompleto = r() < 0.08
    personas.push({
      documento: esPasaporte
        ? `P${Math.floor(r() * 90_000_000 + 10_000_000)}`
        : `${cuerpo.toLocaleString("es-CL")}-${calcularDV(String(cuerpo))}`,
      nombre_completo: `${nombre} ${ap1} ${ap2}`,
      fecha_nacimiento: `${pad(1 + Math.floor(r() * 28))}-${pad(1 + Math.floor(r() * 12))}-${anio}`,
      prevision: incompleto && r() < 0.5 ? undefined : elegir(PREVISIONES),
      direccion:
        incompleto && r() < 0.6
          ? undefined
          : `${elegir(CALLES)} ${100 + Math.floor(r() * 4900)}, ${elegir(COMUNAS)}`,
      email:
        incompleto && r() < 0.7
          ? undefined
          : `${quitarTildes(nombre)}.${quitarTildes(ap1)}${Math.floor(r() * 90 + 10)}@${elegir(["gmail.com", "outlook.com", "yahoo.es", "hotmail.com"])}`,
      seguro: incompleto && r() < 0.5 ? undefined : elegir(SEGUROS),
      telefono: `+569${Math.floor(10_000_000 + r() * 89_999_999)}`,
    })
  }
  return personas
}

function plantillasDemo(ahora: string): Plantilla[] {
  const base = {
    uso: { veces: 0, ultimoUso: null },
    creadaEn: ahora,
    actualizadaEn: ahora,
    eliminadaEn: null,
    campoFecha: "fecha_registro",
  }
  const filtroPagos = grupoVacio("Y")
  filtroPagos.hijos.push({
    id: nuevoId(),
    tipo: "condicion",
    campo: "monto",
    operador: "mayor",
    valor: "0",
  })
  return [
    {
      ...base,
      id: "pl-ingresos",
      nombre: "Ingresos mensuales por profesional",
      unidad: "filas",
      descripcion:
        "Detalle de pagos del período, ingresos por profesional y resumen en prosa para dirección.",
      filtros: filtroPagos,
      uso: { veces: 14, ultimoUso: ahora },
      archivos: [
        {
          id: nuevoId("a"),
          formato: "excel",
          nombre: "Detalle de pagos",
          bloques: [
            {
              id: nuevoId("b"),
              tipo: "tabla",
              titulo: "Pagos del período",
              campos: [
                "fecha_registro",
                "documento",
                "nombre_completo",
                "profesional",
                "concepto",
                "medio_pago",
                "monto",
              ],
            },
            {
              id: nuevoId("b"),
              tipo: "medidas",
              titulo: "Resumen de montos",
              campo: "monto",
              medidas: ["conteo", "suma", "promedio", "mediana", "variacion"],
            },
          ],
        },
        {
          id: nuevoId("a"),
          formato: "pdf",
          nombre: "Informe para dirección",
          bloques: [
            {
              id: nuevoId("b"),
              tipo: "texto",
              titulo: "Resumen",
              campo: "monto",
              texto: TEXTO_PROSA_PREDETERMINADO,
            },
            {
              id: nuevoId("b"),
              tipo: "grafico",
              titulo: "Ingresos por profesional",
              grafico: "barras",
              campoX: "profesional",
              campoY: "monto",
              agregacion: "suma",
            },
            {
              id: nuevoId("b"),
              tipo: "grafico",
              titulo: "Evolución mensual",
              grafico: "tendencia",
              campoX: "__mes",
              campoY: "monto",
              agregacion: "suma",
            },
          ],
        },
      ],
    },
    {
      ...base,
      id: "pl-prevision",
      nombre: "Pacientes por previsión",
      unidad: "filas",
      descripcion:
        "Distribución de atenciones según previsión de salud y seguro complementario.",
      filtros: grupoVacio("Y"),
      uso: { veces: 6, ultimoUso: ahora },
      archivos: [
        {
          id: nuevoId("a"),
          formato: "pdf",
          nombre: "Previsión de pacientes",
          bloques: [
            {
              id: nuevoId("b"),
              tipo: "grafico",
              titulo: "Atenciones por previsión",
              grafico: "anillo",
              campoX: "prevision",
              agregacion: "conteo",
            },
            {
              id: nuevoId("b"),
              tipo: "grafico",
              titulo: "Previsión según seguro",
              grafico: "barras_apiladas",
              campoX: "prevision",
              agregacion: "conteo",
              campoSerie: "seguro",
            },
            {
              id: nuevoId("b"),
              tipo: "tabla",
              titulo: "Detalle",
              campos: ["documento", "nombre_completo", "prevision", "seguro"],
            },
          ],
        },
      ],
    },
    {
      ...base,
      id: "pl-agenda",
      nombre: "Demanda por día y hora",
      unidad: "citas",
      descripcion:
        "Citas consolidadas por día de la semana y franja horaria para planificar la agenda.",
      filtros: grupoVacio("Y"),
      archivos: [
        {
          id: nuevoId("a"),
          formato: "pdf",
          nombre: "Demanda de agenda",
          bloques: [
            {
              id: nuevoId("b"),
              tipo: "grafico",
              titulo: "Concentración semanal",
              grafico: "heatmap",
              campoX: "__dia_semana",
              agregacion: "conteo",
            },
            {
              id: nuevoId("b"),
              tipo: "grafico",
              titulo: "Citas por mes",
              grafico: "lineas",
              campoX: "__mes",
              agregacion: "conteo",
            },
          ],
        },
        {
          id: nuevoId("a"),
          formato: "excel",
          nombre: "Citas consolidadas",
          bloques: [
            {
              id: nuevoId("b"),
              tipo: "tabla",
              titulo: "Citas",
              campos: [
                "fecha_registro",
                "id_cita",
                "nombre_completo",
                "profesional",
                "monto",
              ],
            },
          ],
        },
      ],
    },
  ]
}

async function sembrar() {
  const r = prng(20250314)
  const elegir = <T>(l: T[]) => l[Math.floor(r() * l.length)]
  const ahora = new Date().toISOString()

  // Usuarios demo
  const usuarios: UsuarioRegistro[] = []
  for (const c of CUENTAS_DEMO) {
    const sal = uid()
    usuarios.push({
      id: uid("u-"),
      nombreUsuario: c.nombreUsuario,
      correo: c.correo,
      telefono: c.telefono,
      rol: c.rol,
      activo: true,
      correoVerificado: true,
      creadoEn: ahora,
      preferencias: { ...PREFERENCIAS_INICIALES },
      sal,
      hash: await hashContrasena(c.contrasena, sal),
    })
  }

  // Pagos de los últimos ~16 meses
  const personas = generarPersonas(r, 340)
  const hoy = new Date()
  const inicio = new Date(hoy.getFullYear() - 1, hoy.getMonth() - 3, 1)
  const dias = Math.floor((hoy.getTime() - inicio.getTime()) / 86400000)
  const filas: FilaProcesada[] = []
  let cita = 10450
  for (let i = 0; i < 2100; i++) {
    const p = personas[Math.floor(Math.pow(r(), 1.4) * personas.length)]
    let fecha: Date
    do fecha = new Date(inicio.getTime() + Math.floor(r() * dias) * 86400000)
    while (fecha.getDay() === 0 && r() < 0.9)
    const hora = `${pad(8 + Math.floor(Math.pow(r(), 0.9) * 11))}:${pad(Math.floor(r() * 4) * 15)}`
    const [concepto, precio] = elegir(CONCEPTOS)
    const idCita = String(cita++)
    const partes = r() < 0.08 ? 2 : 1
    for (let k = 0; k < partes; k++) {
      const crudos: Record<string, unknown> = {
        ...Object.fromEntries(
          Object.entries(p).filter(([, v]) => v !== undefined),
        ),
        fecha_registro: `${pad(fecha.getDate())}-${pad(fecha.getMonth() + 1)}-${fecha.getFullYear()}`,
        hora_registro: hora,
        id_cita: idCita,
        profesional: elegir(PROFESIONALES),
        concepto,
        medio_pago: elegir(MEDIOS),
        monto: Math.round((precio * (0.85 + r() * 0.35)) / partes / 100) * 100,
      }
      filas.push(
        procesarFila(crudos, {
          uid: `demo-${i}-${k}`,
          archivo: "pagos_philaxmed_historico.xlsx",
          numero: filas.length + 2,
          tipoPlanilla: "pagos",
          tiposExtra: {},
        }),
      )
    }
  }

  const validas = filas.filter((f) => !tieneErrores(f))
  // Filas con error de demostración: RUN con dígito verificador incorrecto y fila sin documento.
  const conError = validas
    .slice(40, 46)
    .map((f, i) => {
      const doc = String(f.crudos.documento)
      const malo =
        i === 5 ? undefined : doc.slice(0, -1) + (doc.endsWith("1") ? "2" : "1")
      const crudos = { ...f.crudos, documento: malo }
      if (!malo) delete crudos.documento
      return procesarFila(crudos, {
        uid: `demo-err-${i}`,
        archivo: "pagos_philaxmed_marzo.xlsx",
        numero: 12 + i * 7,
        tipoPlanilla: "pagos",
        tiposExtra: {},
      })
    })
    .filter(tieneErrores)

  const importacionId = "imp-demo"
  const guardadas: FilaGuardada[] = validas.map((f) =>
    aGuardada(f, importacionId),
  )
  const previos = new Map<string, Paciente | null>()

  await db.transaction("rw", db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
    await db.usuarios.bulkPut(usuarios)
    await guardarFilas(guardadas, previos)
    await db.filasError.bulkPut(
      conError.map((fila) => ({
        id: uid("e-"),
        importacionId,
        fila,
        creadaEn: ahora,
      })),
    )
    // Duplicados pendientes: la misma persona y fecha que una fila ya guardada, con un monto distinto.
    const pendientes = guardadas.slice(200, 202).map((g, i) => {
      const original = validas[200 + i]
      const nueva = procesarFila(
        { ...original.crudos, monto: Number(original.crudos.monto) + 5000 },
        {
          uid: `demo-dup-${i}`,
          archivo: "pagos_philaxmed_marzo.xlsx",
          numero: 40 + i,
          tipoPlanilla: "pagos",
          tiposExtra: {},
        },
      )
      return {
        id: uid("p-"),
        importacionId,
        nueva,
        existenteId: g.id,
        existente: g,
        creadaEn: ahora,
      }
    })
    await db.pendientes.bulkPut(pendientes)
    await db.importaciones.put({
      id: importacionId,
      creadaEn: ahora,
      usuario: CUENTAS_DEMO[0].nombreUsuario,
      archivos: [
        {
          nombre: "pagos_philaxmed_historico.xlsx",
          tipoPlanilla: "pagos",
          filas: filas.length,
        },
      ],
      conteos: {
        nuevas: guardadas.length,
        reemplazadas: 0,
        ambas: 0,
        descartadas: 0,
        conError: conError.length,
        pendientes: pendientes.length,
      },
      estado: "activa",
      insertadas: guardadas.map((g) => g.id),
      reemplazadas: [],
      pacientesPrevios: [...previos].map(([doc, previo]) => ({ doc, previo })),
    })
    await db.plantillas.bulkPut(plantillasDemo(ahora))
    await db.ajustes.put({ clave: "semilla", valor: VERSION_SEMILLA })
  })
  datosCambiaron()
}

let enCurso: Promise<void> | null = null

/** Siembra los datos demo una sola vez por navegador (o tras cambiar la versión de la semilla). */
export function asegurarSemilla(): Promise<void> {
  enCurso ??= (async () => {
    const actual = await db.ajustes.get("semilla")
    if (actual?.valor !== VERSION_SEMILLA) await sembrar()
  })()
  return enCurso
}

/** Borra todo y vuelve a cargar los datos de demostración. */
export async function restablecerDemo(): Promise<void> {
  enCurso = sembrar()
  await enCurso
}
