import { describe, expect, it } from "vitest"
import { actualizarDatos, errorDeDocumento, marcarPasaporte } from "../masivo"
import { tieneErrores, procesarFila } from "../rules"

let i = 0
const fila = (crudos: Record<string, unknown>) =>
  procesarFila(crudos, { uid: `u${i++}`, archivo: "a.csv", numero: i, tipoPlanilla: "pacientes", tiposExtra: {} })

describe("acciones masivas", () => {
  it("marcar como pasaporte resuelve un RUN inválido", () => {
    const f = fila({ documento: "12.345.678-9", fecha_registro: "04/03/2025", nombre_completo: "John Doe" })
    expect(errorDeDocumento(f)).toBe(true)
    const p = marcarPasaporte(f)
    expect(tieneErrores(p)).toBe(false)
    expect(p.tipoDoc).toBe("pasaporte")
    expect(errorDeDocumento(p)).toBe(false)
  })

  it("actualizar datos conserva lo guardado y toma las celdas nuevas con valor", () => {
    const base = { documento: "12.345.678-5", fecha_registro: "04/03/2025" }
    const guardada = fila({ ...base, nombre_completo: "Ana Pérez", telefono: "+56912345678", concepto: "Consulta" })
    const nueva = fila({ ...base, nombre_completo: "Ana Pérez Soto", telefono: "", concepto: "Consulta" })
    const { fila: r, combinacion } = actualizarDatos(guardada, nueva)
    expect(r.campos.nombre_completo.o).toBe("Ana Pérez Soto")
    expect(r.campos.telefono?.o).toBeTruthy()
    expect(combinacion.telefono).toBe("anterior")
    expect(combinacion.nombre_completo).toBe("nueva")
  })
})
