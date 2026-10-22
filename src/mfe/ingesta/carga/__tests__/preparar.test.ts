import { describe, expect, it } from "vitest"
import type { AccionDuplicado } from "@/contracts"
import type { MapeoColumna } from "@/domain/columns"
import { claveDuplicado } from "@/domain/duplicates"
import type { FilaGuardada, TipoPlanilla } from "@/domain/model"
import { procesarFila } from "@/domain/rules"
import {
  armarPeticion,
  clasificar,
  columnasExtraDe,
  problemasMapeo,
  type Lote,
} from "../preparar"

let i = 0
const fila = (
  crudos: Record<string, unknown>,
  tipoPlanilla: TipoPlanilla = "pacientes",
) =>
  procesarFila(crudos, {
    uid: `u${i++}`,
    archivo: "a.csv",
    numero: i,
    tipoPlanilla,
    tiposExtra: {},
  })

/** Fila ya guardada en la base, construida a partir de una fila procesada válida. */
const guardar = (crudos: Record<string, unknown>, id: string): FilaGuardada => {
  const f = fila(crudos)
  if (!f.doc || !f.tipoDoc) throw new Error("La fila de prueba necesita un documento válido")
  return {
    id,
    importacionId: "i0",
    archivo: f.archivo,
    numero: f.numero,
    tipoPlanilla: f.tipoPlanilla,
    doc: f.doc,
    tipoDoc: f.tipoDoc,
    fechaRegistro: f.fechaRegistro,
    monto: f.monto,
    campos: f.campos,
    claveDup: claveDuplicado(f),
    creadaEn: "2025-03-01T00:00:00Z",
  }
}

const clave = {
  documento: "12.345.678-5",
  fecha_registro: "04/03/2025",
  hora_registro: "10:00",
}
const otra = {
  documento: "11.111.111-1",
  fecha_registro: "05/03/2025",
  hora_registro: "09:00",
}
const archivos = [
  { nombre: "a.csv", tipoPlanilla: "pacientes" as const, filas: 0 },
]

/** Lote de N filas idénticas (A, B, C…) con las acciones dadas para las repetidas. */
function loteRepetido(...acciones: AccionDuplicado[]): Lote {
  const filas = [
    fila({ ...clave, nombre_completo: "A" }),
    ...acciones.map((_, j) =>
      fila({ ...clave, nombre_completo: String.fromCharCode(66 + j) }),
    ),
  ]
  const lote = clasificar(filas, [])
  lote.duplicados.forEach((d, j) => (d.accion = acciones[j]))
  return lote
}
const nombres = (fs: { campos: Record<string, { o: string }> }[]) =>
  fs.map((f) => f.campos.nombre_completo?.o)

describe("clasificar", () => {
  it("separa filas con error y detecta duplicados contra lo guardado y dentro del lote", () => {
    const guardada = guardar({ ...otra, nombre_completo: "G" }, "g1")
    const lote = clasificar(
      [
        fila({ ...clave }),
        fila({ ...clave }),
        fila({ ...otra }),
        fila({ documento: "" }),
      ],
      [guardada],
    )
    expect(lote.validas).toHaveLength(3)
    expect(lote.conError).toHaveLength(1)
    expect(lote.duplicados.map((d) => d.contra.origen)).toEqual([
      "archivo",
      "guardado",
    ])
    expect(lote.duplicados.every((d) => d.accion === "decidir_despues")).toBe(
      true,
    )
  })
})

describe("armarPeticion", () => {
  it("inserta las filas sin conflicto y envía decisiones contra lo guardado con su id", () => {
    const guardada = guardar({ ...otra }, "g1")
    const lote = clasificar([fila({ ...clave }), fila({ ...otra })], [guardada])
    lote.duplicados[0].accion = "conservar_nueva"
    const p = armarPeticion(lote, archivos, [])
    expect(p.insertar).toHaveLength(1)
    expect(p.decisiones).toEqual([
      expect.objectContaining({ accion: "conservar_nueva", existenteId: "g1" }),
    ])
  })

  it("«conservar la nueva» dentro del lote reemplaza a la original", () => {
    const p = armarPeticion(loteRepetido("conservar_nueva"), archivos, [])
    expect(p.insertar).toHaveLength(0)
    expect(
      p.decisiones.map((d) => [d.nueva.campos.nombre_completo?.o, d.accion]),
    ).toEqual([["B", "conservar_nueva"]])
  })

  it("en cadena, solo queda la última fila elegida como nueva", () => {
    const p = armarPeticion(
      loteRepetido("conservar_nueva", "conservar_nueva"),
      archivos,
      [],
    )
    expect(p.insertar).toHaveLength(0)
    expect(p.decisiones.map((d) => d.accion)).toEqual([
      "conservar_anterior",
      "conservar_nueva",
    ])
    expect(nombres(p.decisiones.map((d) => d.existente))).toEqual(["A", "B"])
  })

  it("«conservar anterior» tras un reemplazo mantiene la fila que la reemplazó", () => {
    const p = armarPeticion(
      loteRepetido("conservar_nueva", "conservar_anterior"),
      archivos,
      [],
    )
    expect(p.insertar).toHaveLength(0)
    expect(p.decisiones.map((d) => d.accion)).toEqual([
      "conservar_nueva",
      "conservar_anterior",
    ])
    expect(nombres([p.decisiones[1].existente])).toEqual(["B"])
  })

  it("«guardar ambas» no se pierde si después otra fila reemplaza a la original", () => {
    const p = armarPeticion(
      loteRepetido("guardar_ambas", "conservar_nueva"),
      archivos,
      [],
    )
    expect(p.insertar).toHaveLength(0)
    expect(p.decisiones.map((d) => d.accion)).toEqual([
      "guardar_ambas",
      "conservar_nueva",
    ])
  })

  it("las pendientes se comparan con la fila que finalmente se guarda", () => {
    const p = armarPeticion(
      loteRepetido("decidir_despues", "conservar_nueva"),
      archivos,
      [],
    )
    expect(p.decisiones[0]).toMatchObject({
      accion: "decidir_despues",
      existenteId: null,
    })
    expect(nombres([p.decisiones[0].existente])).toEqual(["C"])
  })

  it("sin reemplazos, la original se inserta una sola vez", () => {
    const p = armarPeticion(
      loteRepetido("conservar_anterior", "guardar_ambas"),
      archivos,
      [],
    )
    expect(nombres(p.insertar)).toEqual(["A"])
  })
})

describe("validación de mapeos", () => {
  const m = (
    destino: MapeoColumna["destino"],
    extra: Partial<MapeoColumna> = {},
    indice = 0,
  ): MapeoColumna => ({
    indice,
    encabezado: String(destino),
    destino,
    confianza: "alta",
    ...extra,
  })

  it("exige la columna de documento", () => {
    expect(problemasMapeo([m("nombre_completo")], "pacientes")).toEqual([
      expect.stringContaining("RUN o pasaporte"),
    ])
  })

  it("exige el monto en planillas de pagos", () => {
    expect(problemasMapeo([m("documento")], "pagos")).toEqual([
      expect.stringContaining("monto"),
    ])
    expect(
      problemasMapeo([m("documento"), m("monto", {}, 1)], "pagos"),
    ).toEqual([])
  })

  it("detecta un campo asignado a varias columnas, ignorando extras e ignoradas", () => {
    const p = problemasMapeo(
      [
        m("documento"),
        m("email", {}, 1),
        m("email", {}, 2),
        m("ignorar", {}, 3),
        m("ignorar", {}, 4),
        m("extra", { claveExtra: "x" }, 5),
        m("extra", { claveExtra: "y" }, 6),
      ],
      "pacientes",
    )
    expect(p).toHaveLength(1)
    expect(p[0]).toContain("2 columnas")
  })

  it("reúne columnas extra sin repetir claves entre hojas", () => {
    const extras = columnasExtraDe([
      [m("extra", { claveExtra: "sucursal", encabezado: "Sucursal" })],
      [
        m("extra", { claveExtra: "sucursal", encabezado: "SUCURSAL" }),
        m("extra", {
          claveExtra: "box",
          encabezado: "Box",
          tipoExtra: "numero",
        }),
      ],
    ])
    expect(extras).toEqual([
      { clave: "sucursal", etiqueta: "Sucursal", tipo: "texto" },
      { clave: "box", etiqueta: "Box", tipo: "numero" },
    ])
  })
})
