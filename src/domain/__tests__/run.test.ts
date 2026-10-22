import { describe, expect, it } from "vitest"
import { analizarDocumento, calcularDV, formatearRun } from "../run"

describe("RUN / pasaporte", () => {
  it("calcula el dígito verificador por módulo 11", () => {
    expect(calcularDV("12345678")).toBe("5")
    expect(calcularDV("11111111")).toBe("1")
    expect(calcularDV("10000013")).toBe("K")
  })

  it("normaliza RUN válidos a 12345678-5, sin puntos", () => {
    for (const v of [
      "12.345.678-5",
      "12345678-5",
      "123456785",
      " 12.345.678 - 5 ",
    ]) {
      expect(analizarDocumento(v)).toMatchObject({
        ok: true,
        tipo: "run",
        normalizado: "12345678-5",
      })
    }
    expect(analizarDocumento("10.000.013-k")).toMatchObject({
      ok: true,
      normalizado: "10000013-K",
    })
  })

  it("marca como error un RUN con dígito verificador incorrecto e informa el esperado", () => {
    expect(analizarDocumento("12.345.678-9")).toMatchObject({
      ok: false,
      tipo: "run",
      motivo: "digito_verificador",
      dvEsperado: "5",
    })
  })

  it("reconoce pasaportes alfanuméricos", () => {
    expect(analizarDocumento("AB1234567")).toMatchObject({
      ok: true,
      tipo: "pasaporte",
      normalizado: "AB1234567",
    })
    expect(analizarDocumento("p-998877")).toMatchObject({
      ok: true,
      tipo: "pasaporte",
      normalizado: "P998877",
    })
  })

  it("permite forzar pasaporte cuando un número con forma de RUN es extranjero", () => {
    expect(
      analizarDocumento("123456789", { forzarPasaporte: true }),
    ).toMatchObject({ ok: true, tipo: "pasaporte" })
  })

  it("rechaza valores vacíos o con formato no reconocido", () => {
    expect(analizarDocumento("")).toMatchObject({ ok: false, motivo: "vacio" })
    expect(analizarDocumento("abc")).toMatchObject({
      ok: false,
      motivo: "formato",
    })
    expect(analizarDocumento("12/34")).toMatchObject({
      ok: false,
      motivo: "formato",
    })
  })

  it("formatea para mostrar", () => {
    expect(formatearRun("12345678-5")).toBe("12.345.678-5")
  })
})
