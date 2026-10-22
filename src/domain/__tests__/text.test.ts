import { describe, expect, it } from "vitest"
import { claveDesdeEncabezado, limpiarOriginal, normalizarTexto } from "../text"
import { normalizarTelefono, correoValido } from "../contact"
import { parsearFecha, parsearHora, semanaDelMes } from "../dates"
import { parsearMonto } from "../format"
import { neutralizarCelda } from "../sanitize"

describe("normalización de texto", () => {
  it("pasa a minúsculas, quita tildes y espacios sobrantes", () => {
    expect(normalizarTexto("  José   PÉREZ  ")).toBe("jose perez")
  })
  it("la ñ queda como n solo en el valor normalizado", () => {
    expect(normalizarTexto("Muñoz")).toBe("munoz")
    expect(limpiarOriginal("Muñoz")).toBe("Muñoz")
  })
  it("elimina caracteres de control", () => {
    expect(normalizarTexto("Ana\u0000\tMaría\u200B")).toBe("ana maria")
  })
  it("convierte encabezados en claves", () => {
    expect(claveDesdeEncabezado("Fecha de Nacimiento")).toBe(
      "fecha_de_nacimiento",
    )
    expect(claveDesdeEncabezado("N° Atención")).toBe("n_atencion")
  })
})

describe("fechas, teléfonos, correos y montos", () => {
  it("interpreta siempre día/mes/año", () => {
    expect(parsearFecha("04/03/2025")).toEqual({ fecha: "2025-03-04" })
    expect(parsearFecha("04-03-2025 09:30")).toEqual({
      fecha: "2025-03-04",
      hora: "09:30",
    })
    expect(parsearFecha("2025-03-04")).toEqual({ fecha: "2025-03-04" })
  })
  it("acepta seriales de Excel", () => {
    expect(parsearFecha(45658)).toEqual({ fecha: "2025-01-01" })
  })
  it("rechaza fechas imposibles", () => {
    expect(parsearFecha("31/02/2024")).toBeNull()
    expect(parsearFecha("03/25/2025")).toBeNull()
  })
  it("lee horas", () => {
    expect(parsearHora("9:05")).toBe("09:05")
    expect(parsearHora(0.5)).toBe("12:00")
    expect(parsearHora("25:00")).toBeNull()
  })
  it("semana del mes: la semana 1 contiene el día 1 (lunes a domingo)", () => {
    // 1 de marzo de 2025 es sábado → semana 1; lunes 3 → semana 2
    expect(semanaDelMes(2025, 3, 1)).toBe(1)
    expect(semanaDelMes(2025, 3, 2)).toBe(1)
    expect(semanaDelMes(2025, 3, 3)).toBe(2)
    expect(semanaDelMes(2025, 3, 31)).toBe(6)
  })
  it("normaliza teléfonos a +56", () => {
    expect(normalizarTelefono("9 8765 4321")).toBe("+56987654321")
    expect(normalizarTelefono("+56 9 8765 4321")).toBe("+56987654321")
    expect(normalizarTelefono("8765432")).toBeNull()
  })
  it("valida correos", () => {
    expect(correoValido("Ana@Clinica.CL")).toBe(true)
    expect(correoValido("juan@gmail")).toBe(false)
  })
  it("lee montos con formato chileno", () => {
    expect(parsearMonto("$45.000")).toBe(45000)
    expect(parsearMonto("12.345,5")).toBe(12345.5)
    expect(parsearMonto("abc")).toBeNull()
  })
  it("neutraliza inyección de fórmulas", () => {
    expect(neutralizarCelda('=HYPERLINK("x")')).toBe(`'=HYPERLINK("x")`)
    expect(neutralizarCelda("@SUM(A1)")).toBe(`'@SUM(A1)`)
    expect(neutralizarCelda(-5)).toBe(-5)
    expect(neutralizarCelda("Ana")).toBe("Ana")
  })
})
