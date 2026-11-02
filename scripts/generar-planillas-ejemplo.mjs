// Genera planillas de ejemplo para demostrar la carga de archivos (pnpm ejemplos).
// Salida: public/planillas-ejemplo/. Datos ficticios y deterministas; las fechas de registro
// caen en el mes anterior a la ejecución para que aparezcan en reportes por período.
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import ExcelJS from "exceljs"
import * as XLSX from "xlsx"

const DESTINO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../public/planillas-ejemplo",
)
mkdirSync(DESTINO, { recursive: true })

// ---------- utilidades ----------
function prng(semilla) {
  let a = semilla
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const r = prng(20260901)
const elegir = (l) => l[Math.floor(r() * l.length)]
const entero = (min, max) => min + Math.floor(r() * (max - min + 1))
const pad = (n) => String(n).padStart(2, "0")

function calcularDV(cuerpo) {
  let suma = 0
  let m = 2
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * m
    m = m === 7 ? 2 : m + 1
  }
  const resto = 11 - (suma % 11)
  return resto === 11 ? "0" : resto === 10 ? "K" : String(resto)
}
const conPuntos = (c) => c.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
const sinTildes = (s) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "")

/** Fecha UTC (ExcelJS la guarda como serial sin corrimiento de zona). */
const fechaUTC = (a, m, d, h = 0, min = 0) => new Date(Date.UTC(a, m - 1, d, h, min))
const textoFecha = (f, sep = "-") =>
  `${pad(f.getUTCDate())}${sep}${pad(f.getUTCMonth() + 1)}${sep}${f.getUTCFullYear()}`
const textoHora = (f) => `${pad(f.getUTCHours())}:${pad(f.getUTCMinutes())}`
/** Fracción de día de Excel para una hora (celda con formato hh:mm). */
const fraccionHora = (f) => (f.getUTCHours() * 60 + f.getUTCMinutes()) / 1440

// Mes anterior a la ejecución.
const hoy = new Date()
const ANIO = hoy.getMonth() === 0 ? hoy.getFullYear() - 1 : hoy.getFullYear()
const MES = hoy.getMonth() === 0 ? 12 : hoy.getMonth()
const DIAS_MES = new Date(Date.UTC(ANIO, MES, 0)).getUTCDate()
const NOMBRE_MES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
  "agosto", "septiembre", "octubre", "noviembre", "diciembre",
][MES - 1]

/** Día hábil aleatorio del mes, entre 09:00 y 19:45 en bloques de 15 min. */
function momentoAtencion(diaMin = 1, diaMax = DIAS_MES) {
  let d
  do d = entero(diaMin, diaMax)
  while (new Date(Date.UTC(ANIO, MES - 1, d)).getUTCDay() === 0)
  return fechaUTC(ANIO, MES, d, entero(9, 19), elegir([0, 15, 30, 45]))
}

// ---------- catálogos ----------
const NOMBRES = [
  "Camila", "Valentina", "Sofía", "Isidora", "Antonia", "Fernanda", "Javiera",
  "Catalina", "Constanza", "Francisca", "Benjamín", "Vicente", "Martín",
  "Joaquín", "Agustín", "Tomás", "Cristóbal", "Sebastián", "Diego",
  "María José", "Juan Pablo", "Rosa", "Luis", "Patricia", "Jorge", "Florencia",
  "Ignacio", "Macarena", "Rodrigo", "Daniela",
]
const APELLIDOS = [
  "González", "Muñoz", "Rojas", "Díaz", "Pérez", "Soto", "Contreras", "Silva",
  "Martínez", "Sepúlveda", "Morales", "Rodríguez", "López", "Fuentes",
  "Hernández", "Torres", "Araya", "Flores", "Espinoza", "Valenzuela",
  "Castillo", "Tapia", "Reyes", "Gutiérrez", "Castro", "Pizarro", "Álvarez",
  "Vásquez", "Núñez", "Ibáñez",
]
const PREVISIONES = [
  "Fonasa B", "Fonasa C", "Fonasa D", "Isapre Banmédica", "Isapre Colmena",
  "Isapre Consalud", "Isapre Cruz Blanca", "Isapre Vida Tres", "Particular",
]
const SEGUROS = ["Sin seguro", "MetLife", "BICE Vida", "Consorcio", "Sura", "Chilena Consolidada"]
const COMUNAS = ["Providencia", "Ñuñoa", "Las Condes", "Santiago", "La Florida", "Vitacura", "La Reina", "Lo Barnechea"]
const CALLES = [
  "Av. Providencia", "Irarrázaval", "Av. Apoquindo", "Los Leones",
  "Pedro de Valdivia", "Av. Grecia", "Manuel Montt", "Av. Kennedy",
  "Av. Las Condes", "Av. Ossa",
]
const PROFESIONALES = [
  "Dra. Paula Contreras", "Dr. Andrés Valdés", "Dra. Ignacia Morales",
  "Dr. Felipe Navarro", "TM. Carolina Vidal",
]
const PRESTACIONES = [
  ["Consulta dermatológica", 45000],
  ["Control dermatológico", 30000],
  ["Dermatoscopia digital", 55000],
  ["Depilación láser (sesión)", 60000],
  ["Láser CO2 fraccionado", 180000],
  ["Peeling químico", 75000],
  ["Crioterapia", 35000],
  ["Biopsia de piel", 90000],
  ["Toxina botulínica", 220000],
]
const MEDIOS = ["Débito", "Crédito", "Efectivo", "Transferencia"]

// ---------- pacientes ----------
const usados = new Set()
function nuevoRun() {
  let c
  do c = 7_000_000 + Math.floor(r() * 19_000_000)
  while (usados.has(c))
  usados.add(c)
  const cuerpo = String(c)
  return { cuerpo, dv: calcularDV(cuerpo) }
}
function nuevaPersona(i) {
  const nombres = elegir(NOMBRES)
  const ap1 = elegir(APELLIDOS)
  const ap2 = elegir(APELLIDOS)
  const run = nuevoRun()
  const nac = fechaUTC(entero(1950, 2006), entero(1, 12), entero(1, 28))
  return {
    run,
    // Formatos de RUN variados, como llegan de distintas fuentes.
    documento:
      i % 7 === 3 ? `${run.cuerpo}${run.dv}`
      : i % 3 === 1 ? `${run.cuerpo}-${run.dv}`
      : `${conPuntos(run.cuerpo)}-${run.dv}`,
    nombres,
    ap1,
    ap2,
    nombre: `${nombres} ${ap1} ${ap2}`,
    nacimiento: nac,
    prevision: elegir(PREVISIONES),
    direccion: `${elegir(CALLES)} ${entero(100, 9800)}, ${elegir(COMUNAS)}`,
    email: `${sinTildes(nombres)}.${sinTildes(ap1)}${entero(10, 99)}@${elegir(["gmail.com", "outlook.com", "hotmail.com", "yahoo.es"])}`,
    seguro: elegir(SEGUROS),
    telefono:
      i % 4 === 0 ? `9 ${entero(1000, 9999)} ${entero(1000, 9999)}`
      : i % 4 === 1 ? `+56 9 ${entero(1000, 9999)} ${entero(1000, 9999)}`
      : `+569${entero(10_000_000, 99_999_999)}`,
  }
}
const PERSONAS = Array.from({ length: 90 }, (_, i) => nuevaPersona(i))
// Un paciente extranjero con pasaporte.
PERSONAS[5] = {
  ...PERSONAS[5],
  documento: "AR4817265",
  nombres: "Lucía",
  ap1: "Ferreyra",
  ap2: "Benítez",
  nombre: "Lucía Ferreyra Benítez",
  prevision: "Particular",
  seguro: "Sin seguro",
}

// ---------- estilos ExcelJS ----------
const VERDE = "FF0F766E"
function hojaConTabla(libro, nombre, columnas, filas, opciones = {}) {
  const hoja = libro.addWorksheet(nombre)
  let filaEnc = 1
  if (opciones.titulo) {
    opciones.titulo.forEach((t, i) => {
      const f = hoja.addRow([t])
      f.font = i === 0 ? { bold: true, size: 14, color: { argb: VERDE } } : { italic: true, color: { argb: "FF555555" } }
    })
    hoja.addRow([])
    filaEnc = opciones.titulo.length + 2
  }
  hoja.views = [{ state: "frozen", ySplit: filaEnc }]
  const enc = hoja.addRow(columnas.map((c) => c.titulo))
  enc.font = { bold: true, color: { argb: "FFFFFFFF" } }
  enc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERDE } }
  enc.alignment = { vertical: "middle" }
  enc.height = 20
  for (const f of filas) hoja.addRow(columnas.map((c) => f[c.clave] ?? null))
  columnas.forEach((c, i) => {
    const col = hoja.getColumn(i + 1)
    col.width = c.ancho ?? 16
    if (c.formato) col.numFmt = c.formato
  })
  hoja.autoFilter = {
    from: { row: filaEnc, column: 1 },
    to: { row: filaEnc, column: columnas.length },
  }
  return hoja
}
async function guardarLibro(libro, archivo) {
  libro.creator = "SkinLaser · datos de demostración"
  libro.created = new Date()
  await libro.xlsx.writeFile(path.join(DESTINO, archivo))
  console.log(`  ✓ ${archivo}`)
}

// ---------- 01: pacientes sin errores ----------
async function pacientesLimpio() {
  const filas = PERSONAS.slice(0, 40).map((p) => {
    const m = momentoAtencion()
    return {
      rut: p.documento,
      nombre: p.nombre,
      nac: p.nacimiento,
      prevision: p.prevision,
      direccion: p.direccion,
      email: p.email,
      seguro: p.seguro,
      telefono: p.telefono,
      fecha: fechaUTC(ANIO, MES, m.getUTCDate()),
      hora: textoHora(m),
    }
  })
  filas.sort((a, b) => a.fecha - b.fecha || a.hora.localeCompare(b.hora))
  const libro = new ExcelJS.Workbook()
  hojaConTabla(libro, "Pacientes", [
    { titulo: "RUT", clave: "rut", ancho: 14 },
    { titulo: "Nombre completo", clave: "nombre", ancho: 30 },
    { titulo: "Fecha de nacimiento", clave: "nac", formato: "dd-mm-yyyy", ancho: 19 },
    { titulo: "Previsión", clave: "prevision", ancho: 20 },
    { titulo: "Dirección", clave: "direccion", ancho: 34 },
    { titulo: "Correo electrónico", clave: "email", ancho: 32 },
    { titulo: "Seguro", clave: "seguro", ancho: 20 },
    { titulo: "Teléfono", clave: "telefono", ancho: 18 },
    { titulo: "Fecha de registro", clave: "fecha", formato: "dd-mm-yyyy", ancho: 17 },
    { titulo: "Hora", clave: "hora", ancho: 8 },
  ], filas)
  await guardarLibro(libro, "01_pacientes_sin_errores.xlsx")
}

// ---------- 02: pagos con títulos arriba y pagos fragmentados ----------
const PAGOS_02 = []
{
  let cita = 52100
  for (let i = 0; i < 46; i++) {
    const p = PERSONAS[(i * 7) % 60]
    const m = momentoAtencion()
    const [prest, precio] = elegir(PRESTACIONES)
    const profesional = prest.startsWith("Depilación") ? "TM. Carolina Vidal" : elegir(PROFESIONALES.slice(0, 4))
    const total = Math.round((precio * (0.9 + r() * 0.2)) / 1000) * 1000
    const base = { m, cita: String(cita++), rut: p.documento, paciente: p.nombre, profesional, prestacion: prest }
    if (i % 6 === 2) {
      // Pago fragmentado: una misma atención pagada con dos medios.
      const abono = Math.round((total * 0.4) / 1000) * 1000
      PAGOS_02.push({ ...base, medio: "Efectivo", monto: abono })
      PAGOS_02.push({ ...base, medio: elegir(["Débito", "Crédito"]), monto: total - abono })
    } else {
      PAGOS_02.push({ ...base, medio: elegir(MEDIOS), monto: total })
    }
  }
  PAGOS_02.sort((a, b) => a.m - b.m)
}
const filaPago = (x, i) => ({
  fecha: fechaUTC(ANIO, MES, x.m.getUTCDate()),
  hora: fraccionHora(x.m),
  cita: x.cita,
  rut: x.rut,
  paciente: x.paciente,
  profesional: x.profesional,
  prestacion: x.prestacion,
  medio: x.medio,
  // Algunos montos vienen como texto con signo peso, como en exportaciones manuales.
  monto: i % 9 === 4 ? `$${conPuntos(String(x.monto))}` : x.monto,
})
const COLUMNAS_PAGO = [
  { titulo: "Fecha", clave: "fecha", formato: "dd-mm-yyyy", ancho: 12 },
  { titulo: "Hora", clave: "hora", formato: "hh:mm", ancho: 8 },
  { titulo: "N° atención", clave: "cita", ancho: 12 },
  { titulo: "RUT paciente", clave: "rut", ancho: 14 },
  { titulo: "Paciente", clave: "paciente", ancho: 30 },
  { titulo: "Profesional", clave: "profesional", ancho: 22 },
  { titulo: "Prestación", clave: "prestacion", ancho: 26 },
  { titulo: "Forma de pago", clave: "medio", ancho: 14 },
  { titulo: "Monto", clave: "monto", formato: '"$"#,##0', ancho: 12 },
]
async function pagosConTitulo() {
  const libro = new ExcelJS.Workbook()
  hojaConTabla(libro, `Caja ${NOMBRE_MES}`, COLUMNAS_PAGO, PAGOS_02.map(filaPago), {
    titulo: [
      "SkinLaser · Centro Dermatológico",
      `Reporte de caja PhilaxMed · ${NOMBRE_MES} ${ANIO}`,
    ],
  })
  await guardarLibro(libro, "02_pagos_mes_con_titulo.xlsx")
}

// ---------- 03: pacientes con errores para corregir ----------
async function pacientesConErrores() {
  const base = PERSONAS.slice(60, 78).map((p) => {
    const m = momentoAtencion()
    return {
      run: p.documento,
      nombre: p.nombre,
      nac: textoFecha(p.nacimiento, "/"),
      isapre: p.prevision,
      domicilio: p.direccion,
      mail: p.email,
      seguro: p.seguro,
      celular: p.telefono,
      fecha: textoFecha(m, "/"),
      hora: textoHora(m),
    }
  })
  const malDV = (doc) => doc.slice(0, -1) + (doc.endsWith("1") ? "2" : "1")
  base[1].run = malDV(base[1].run) // DOC-02 dígito verificador
  base[3].run = null // DOC-01 sin documento
  base[5].run = "AB-12" // DOC-03 formato inválido
  base[6].nac = "31/02/1985" // FNAC-01 fecha inexistente
  base[8].nac = "15/07/2099" // FNAC-02 fecha futura
  base[9].mail = base[9].mail.replace(/\.[a-z]+$/, "") // MAIL-01 sin dominio
  base[11].celular = "22345" // TEL-01 (advertencia)
  base[12].hora = "25:70" // HORA-01 (advertencia)
  base[13].fecha = null // FREG-02 (advertencia)
  base[14].fecha = `32/${pad(MES)}/${ANIO}` // FREG-01 fecha inexistente
  base[15].nombre = `  ${base[15].nombre.toUpperCase()}   ` // texto sucio que se normaliza
  base[15].mail = `  ${base[15].mail.toUpperCase()} `
  // Fila repetida dentro del mismo archivo (mismo RUN y fecha/hora de registro).
  base.push({ ...base[0] })
  const libro = new ExcelJS.Workbook()
  hojaConTabla(libro, "Ingresos", [
    { titulo: "RUN", clave: "run", ancho: 14 },
    { titulo: "Nombre", clave: "nombre", ancho: 32 },
    { titulo: "F. Nacimiento", clave: "nac", ancho: 14 },
    { titulo: "Isapre", clave: "isapre", ancho: 20 },
    { titulo: "Domicilio", clave: "domicilio", ancho: 34 },
    { titulo: "Mail", clave: "mail", ancho: 32 },
    { titulo: "Seguro complementario", clave: "seguro", ancho: 22 },
    { titulo: "Celular", clave: "celular", ancho: 18 },
    { titulo: "Fecha ingreso", clave: "fecha", ancho: 14 },
    { titulo: "Hora", clave: "hora", ancho: 8 },
  ], base)
  await guardarLibro(libro, "03_pacientes_con_errores.xlsx")
}

// ---------- 04: libro con dos hojas y columnas adicionales ----------
async function libroVariasHojas() {
  const sucursal = () => elegir(["Providencia", "Las Condes"])
  const pacientes = PERSONAS.slice(40, 60).map((p) => {
    const m = momentoAtencion()
    const control = new Date(m.getTime() + entero(20, 60) * 86400000)
    return {
      rut: p.documento,
      nombres: p.nombres,
      ap1: p.ap1,
      ap2: p.ap2,
      nac: p.nacimiento,
      prevision: p.prevision,
      email: p.email,
      telefono: p.telefono,
      fecha: textoFecha(m),
      hora: textoHora(m),
      sucursal: sucursal(),
      canal: elegir(["Web", "Teléfono", "WhatsApp", "Presencial"]),
      fototipo: elegir(["I", "II", "III", "IV", "V"]),
      sesiones: entero(1, 8),
      control: textoFecha(control, "/"),
    }
  })
  const pagos = []
  let cita = 61800
  for (let i = 0; i < 24; i++) {
    const p = PERSONAS[40 + (i % 20)]
    const m = momentoAtencion()
    const [prest, precio] = elegir(PRESTACIONES)
    pagos.push({
      fecha: `${textoFecha(m)} ${textoHora(m)}`,
      folio: `F-${cita++}`,
      rut: p.documento,
      nombre: p.nombre,
      medico: elegir(PROFESIONALES),
      tratamiento: prest,
      tipo: elegir(MEDIOS),
      valor: Math.round((precio * (0.9 + r() * 0.2)) / 1000) * 1000,
      sucursal: sucursal(),
    })
  }
  const libro = new ExcelJS.Workbook()
  hojaConTabla(libro, "Pacientes", [
    { titulo: "RUN", clave: "rut", ancho: 14 },
    { titulo: "Nombres", clave: "nombres", ancho: 16 },
    { titulo: "Apellido paterno", clave: "ap1", ancho: 16 },
    { titulo: "Apellido materno", clave: "ap2", ancho: 16 },
    { titulo: "Fecha de nacimiento", clave: "nac", formato: "dd/mm/yyyy", ancho: 19 },
    { titulo: "Previsión", clave: "prevision", ancho: 20 },
    { titulo: "Email", clave: "email", ancho: 32 },
    { titulo: "Teléfono", clave: "telefono", ancho: 18 },
    { titulo: "Fecha de registro", clave: "fecha", ancho: 17 },
    { titulo: "Hora", clave: "hora", ancho: 8 },
    { titulo: "Sucursal", clave: "sucursal", ancho: 14 },
    { titulo: "Canal de agendamiento", clave: "canal", ancho: 22 },
    { titulo: "Fototipo", clave: "fototipo", ancho: 10 },
    { titulo: "N° de sesiones", clave: "sesiones", ancho: 14 },
    { titulo: "Próximo control", clave: "control", ancho: 16 },
  ], pacientes)
  hojaConTabla(libro, "Pagos", [
    { titulo: "Fecha", clave: "fecha", ancho: 17 },
    { titulo: "Folio atención", clave: "folio", ancho: 14 },
    { titulo: "RUT", clave: "rut", ancho: 14 },
    { titulo: "Nombre paciente", clave: "nombre", ancho: 30 },
    { titulo: "Médico", clave: "medico", ancho: 22 },
    { titulo: "Tratamiento", clave: "tratamiento", ancho: 26 },
    { titulo: "Tipo pago", clave: "tipo", ancho: 14 },
    { titulo: "Valor", clave: "valor", formato: '"$"#,##0', ancho: 12 },
    { titulo: "Sucursal", clave: "sucursal", ancho: 14 },
  ], pagos)
  await guardarLibro(libro, "04_libro_dos_hojas_columnas_extra.xlsx")
}

// ---------- 05: reenvío de pagos con duplicados del archivo 02 ----------
async function pagosConDuplicados() {
  // 12 pagos idénticos a los del archivo 02 (se detectan como duplicados) + 18 nuevos.
  const repetidos = PAGOS_02.filter((_, i) => i % 4 === 1).slice(0, 12)
  const nuevos = []
  let cita = 53400
  for (let i = 0; i < 18; i++) {
    const p = PERSONAS[60 + (i % 30)]
    const m = momentoAtencion(Math.max(1, DIAS_MES - 10))
    const [prest, precio] = elegir(PRESTACIONES)
    nuevos.push({
      m,
      cita: String(cita++),
      rut: p.documento,
      paciente: p.nombre,
      profesional: elegir(PROFESIONALES.slice(0, 4)),
      prestacion: prest,
      medio: elegir(MEDIOS),
      monto: Math.round((precio * (0.9 + r() * 0.2)) / 1000) * 1000,
    })
  }
  const filas = [...repetidos, ...nuevos]
    .sort((a, b) => a.m - b.m)
    .map((x) => ({ ...filaPago(x, 0), monto: x.monto }))
  const libro = new ExcelJS.Workbook()
  hojaConTabla(libro, "Pagos", COLUMNAS_PAGO, filas, {
    titulo: [`Reenvío de caja PhilaxMed · ${NOMBRE_MES} ${ANIO} (incluye pagos ya enviados)`],
  })
  await guardarLibro(libro, "05_pagos_reenvio_con_duplicados.xlsx")
}

// ---------- 06: CSV exportado por PhilaxMed (punto y coma, Windows-1252) ----------
function csvPhilaxmed() {
  const enc = ["Fecha registro", "Rut", "Nombre del paciente", "Profesional tratante", "Procedimiento", "Medio de pago", "Monto pagado"]
  const lineas = [enc.join(";")]
  let n = 0
  for (const p of PERSONAS.slice(78, 90)) {
    const veces = entero(1, 2)
    for (let k = 0; k < veces; k++) {
      const m = momentoAtencion()
      const [prest, precio] = elegir(PRESTACIONES)
      const monto = Math.round((precio * (0.9 + r() * 0.2)) / 1000) * 1000
      lineas.push([
        `${textoFecha(m, "/")} ${textoHora(m)}`,
        p.documento,
        p.nombre,
        elegir(PROFESIONALES),
        prest,
        elegir(MEDIOS),
        n++ % 2 ? `$${conPuntos(String(monto))}` : String(monto),
      ].join(";"))
    }
  }
  // latin1 coincide con Windows-1252 para todos los caracteres usados (tildes, ñ).
  writeFileSync(
    path.join(DESTINO, "06_exportacion_philaxmed.csv"),
    Buffer.from(lineas.join("\r\n") + "\r\n", "latin1"),
  )
  console.log("  ✓ 06_exportacion_philaxmed.csv")
}

// ---------- 07: planilla antigua .xls (Excel 97-2003) ----------
function xlsAntiguo() {
  const filas = [["Rut", "Paciente", "Fecha nacimiento", "Prevision", "Domicilio", "Telefono", "Fecha"]]
  for (const p of PERSONAS.slice(20, 32)) {
    const m = momentoAtencion()
    filas.push([
      p.documento,
      p.nombre,
      textoFecha(p.nacimiento, "/"),
      p.prevision,
      p.direccion,
      p.telefono,
      textoFecha(m, "/"),
    ])
  }
  const libro = XLSX.utils.book_new()
  const hoja = XLSX.utils.aoa_to_sheet(filas)
  hoja["!cols"] = [14, 30, 16, 20, 34, 18, 12].map((wch) => ({ wch }))
  XLSX.utils.book_append_sheet(libro, hoja, "Hoja1")
  writeFileSync(
    path.join(DESTINO, "07_pacientes_formato_antiguo.xls"),
    XLSX.write(libro, { type: "buffer", bookType: "xls" }),
  )
  console.log("  ✓ 07_pacientes_formato_antiguo.xls")
}

console.log(`Generando planillas de ejemplo (${NOMBRE_MES} ${ANIO}) en ${path.relative(process.cwd(), DESTINO)}/`)
await pacientesLimpio()
await pagosConTitulo()
await pacientesConErrores()
await libroVariasHojas()
await pagosConDuplicados()
csvPhilaxmed()
xlsAntiguo()
