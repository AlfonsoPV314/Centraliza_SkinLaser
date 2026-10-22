import { describe, expect, it } from "vitest"
import { procesarFila } from "../rules"
import {
  consolidarPagos,
  detectarDuplicados,
  sonDuplicadas,
} from "../duplicates"
import type { TipoPlanilla } from "../model"

let i = 0
const fila = (
  crudos: Record<string, unknown>,
  tipoPlanilla: TipoPlanilla = "pagos",
) =>
  procesarFila(crudos, {
    uid: `u${i++}`,
    archivo: "a.csv",
    numero: i,
    tipoPlanilla,
    tiposExtra: {},
  })

const base = {
  documento: "12.345.678-5",
  fecha_registro: "04/03/2025",
  hora_registro: "10:00",
}

describe("duplicados", () => {
  it("en planillas de pacientes, misma clave = duplicado", () => {
    const a = fila({ ...base, nombre_completo: "Ana" }, "pacientes")
    const b = fila({ ...base, nombre_completo: "ANA" }, "pacientes")
    expect(sonDuplicadas(a, b)).toBe(true)
  })

  it("distinta hora = no duplicado", () => {
    const a = fila({ ...base }, "pacientes")
    const b = fila({ ...base, hora_registro: "11:00" }, "pacientes")
    expect(sonDuplicadas(a, b)).toBe(false)
  })

  it("en pagos, misma clave pero distinto monto, concepto o medio NO es duplicado", () => {
    const a = fila({
      ...base,
      monto: "30000",
      concepto: "Láser",
      medio_pago: "Débito",
    })
    const b = fila({
      ...base,
      monto: "15000",
      concepto: "Láser",
      medio_pago: "Efectivo",
    })
    expect(sonDuplicadas(a, b)).toBe(false)
  })

  it("en pagos, misma clave y mismo monto/concepto/medio sí es duplicado", () => {
    const a = fila({
      ...base,
      monto: "$30.000",
      concepto: "Láser",
      medio_pago: "Débito",
    })
    const b = fila({
      ...base,
      monto: "30000",
      concepto: "laser",
      medio_pago: "débito",
    })
    expect(sonDuplicadas(a, b)).toBe(true)
  })

  it("detecta contra el mismo archivo y contra datos guardados", () => {
    const guardada = fila({
      ...base,
      monto: "1000",
      concepto: "X",
      medio_pago: "Y",
    })
    const nuevas = [
      fila({ ...base, monto: "1000", concepto: "X", medio_pago: "Y" }), // duplica la guardada
      fila({ ...base, monto: "2000", concepto: "Z", medio_pago: "Y" }), // nueva
      fila({ ...base, monto: "2000", concepto: "Z", medio_pago: "Y" }), // duplica la anterior del archivo
    ]
    const c = detectarDuplicados(nuevas, [guardada])
    expect(c).toHaveLength(2)
    expect(c[0]).toMatchObject({
      indiceNueva: 0,
      contra: { origen: "guardado" },
    })
    expect(c[1]).toMatchObject({
      indiceNueva: 2,
      contra: { origen: "archivo", indice: 1 },
    })
  })
})

describe("consolidación de pagos fragmentados", () => {
  it("agrupa filas de una misma cita conservando el desglose", () => {
    const filas = [
      fila({
        ...base,
        profesional: "Dra. Rojas",
        monto: "30000",
        concepto: "Láser",
        medio_pago: "Débito",
      }),
      fila({
        ...base,
        profesional: "Dra. Rojas",
        monto: "15000",
        concepto: "Láser",
        medio_pago: "Efectivo",
      }),
      fila({
        ...base,
        hora_registro: "12:00",
        profesional: "Dra. Rojas",
        monto: "9000",
        concepto: "Control",
        medio_pago: "Débito",
      }),
    ]
    const citas = consolidarPagos(filas)
    expect(citas).toHaveLength(2)
    expect(citas[0]).toMatchObject({ total: 45000, doc: "12345678-5" })
    expect(citas[0].detalle).toHaveLength(2)
  })

  it("usa el N° de atención cuando existe", () => {
    const filas = [
      fila({ ...base, id_cita: "A-1", monto: "1000" }),
      fila({ ...base, hora_registro: "15:00", id_cita: "A-1", monto: "500" }),
    ]
    expect(consolidarPagos(filas)).toHaveLength(1)
  })
})

describe("motor de reglas", () => {
  it("produce mensajes claros y separa filas sin documento", () => {
    const f = fila(
      {
        documento: "12.345.678-9",
        email: "juan@gmail",
        fecha_nacimiento: "31/02/1990",
        fecha_registro: "01/01/2025",
      },
      "pacientes",
    )
    const reglas = f.problemas.map((p) => p.regla)
    expect(reglas).toEqual(
      expect.arrayContaining(["DOC-02", "MAIL-01", "FNAC-01"]),
    )
    expect(f.problemas.find((p) => p.regla === "DOC-02")!.mensaje).toContain(
      "12.345.678-9 no coincide con su dígito verificador",
    )
    const sinDoc = fila({ nombre_completo: "Sin RUN" }, "pacientes")
    expect(sinDoc.problemas.map((p) => p.regla)).toContain("DOC-01")
  })

  it("guarda valor original y normalizado", () => {
    const f = fila(
      { ...base, nombre_completo: "  María José  Muñoz " },
      "pacientes",
    )
    expect(f.campos.nombre_completo).toEqual({
      o: "María José Muñoz",
      n: "maria jose munoz",
    })
    expect(f.fechaRegistro).toBe("2025-03-04T10:00")
  })
})
