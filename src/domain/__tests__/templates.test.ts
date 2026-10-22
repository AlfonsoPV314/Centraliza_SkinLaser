import { describe, expect, it } from "vitest"
import type { TipoCampo } from "../model"
import {
  archivoNuevo,
  bloqueNuevo,
  cambiarTipoGrafico,
  plantillaVacia,
  validarPlantilla,
  type Bloque,
  type DatosEditablesPlantilla,
} from "../templates"

const tipos: Record<string, TipoCampo> = {
  fecha_registro: "fecha",
  monto: "monto",
  profesional: "texto",
  prevision: "texto",
  seguro: "texto",
  documento: "documento",
  nombre_completo: "texto",
  __mes: "texto",
  __dia_semana: "numero",
}
const tipoDe = (c: string) => tipos[c]

function con(...bloques: Bloque[]): DatosEditablesPlantilla {
  const p = plantillaVacia()
  p.nombre = "Ingresos"
  p.archivos[0] = { ...p.archivos[0], nombre: "Informe", bloques }
  return p
}
const grafico = (extra: Partial<Extract<Bloque, { tipo: "grafico" }>>) => ({
  ...bloqueNuevo("grafico") as Extract<Bloque, { tipo: "grafico" }>,
  ...extra,
})

describe("validarPlantilla", () => {
  it("una plantilla completa no tiene errores", () => {
    expect(
      validarPlantilla(
        con(
          bloqueNuevo("tabla"),
          grafico({
            campoX: "profesional",
            agregacion: "suma",
            campoY: "monto",
          }),
          bloqueNuevo("medidas"),
          bloqueNuevo("texto"),
        ),
        tipoDe,
      ),
    ).toEqual({})
  })

  it("exige nombre, archivos y contenido", () => {
    const p = plantillaVacia()
    const e = validarPlantilla(p, tipoDe)
    expect(Object.keys(e).sort()).toEqual(
      [
        "nombre",
        `archivo:${p.archivos[0].id}:bloques`,
        `archivo:${p.archivos[0].id}:nombre`,
      ].sort(),
    )
    expect(
      validarPlantilla({ ...p, nombre: "x", archivos: [] }, tipoDe),
    ).toHaveProperty("archivos")
  })

  it("rechaza nombres de archivo repetidos en el mismo formato o con caracteres inválidos", () => {
    const p = con(bloqueNuevo("tabla"))
    const b = {
      ...archivoNuevo("pdf"),
      nombre: " informe ",
      bloques: [bloqueNuevo("tabla")],
    }
    const c = {
      ...archivoNuevo("excel"),
      nombre: "Informe",
      bloques: [bloqueNuevo("tabla")],
    }
    const d = {
      ...archivoNuevo("excel"),
      nombre: "a/b",
      bloques: [bloqueNuevo("tabla")],
    }
    const e = validarPlantilla(
      { ...p, archivos: [...p.archivos, b, c, d] },
      tipoDe,
    )
    expect(Object.keys(e)).toEqual([
      `archivo:${b.id}:nombre`,
      `archivo:${d.id}:nombre`,
    ])
  })

  it("valida el campo de fecha", () => {
    expect(
      validarPlantilla(
        { ...con(bloqueNuevo("tabla")), campoFecha: "monto" },
        tipoDe,
      ),
    ).toHaveProperty("campoFecha")
  })

  it("suma y promedio necesitan un valor numérico", () => {
    const b = grafico({ campoX: "profesional", agregacion: "suma" })
    expect(validarPlantilla(con(b), tipoDe)).toHaveProperty(
      `bloque:${b.id}:campoY`,
    )
    expect(
      validarPlantilla(con({ ...b, campoY: "prevision" }), tipoDe)[
        `bloque:${b.id}:campoY`
      ],
    ).toMatch(/numérico/)
  })

  it("barras apiladas exige un desglose distinto del eje", () => {
    const b = grafico({
      grafico: "barras_apiladas",
      campoX: "prevision",
      campoSerie: "prevision",
    })
    expect(
      validarPlantilla(con(b), tipoDe)[`bloque:${b.id}:campoSerie`],
    ).toMatch(/distinto/)
  })

  it("histograma y dispersión exigen campos numéricos; el mapa de calor no pide ejes", () => {
    const h = grafico({ grafico: "histograma", campoX: "profesional" })
    expect(validarPlantilla(con(h), tipoDe)).toHaveProperty(
      `bloque:${h.id}:campoX`,
    )
    const calor = cambiarTipoGrafico(grafico({}), "heatmap")
    expect(validarPlantilla(con(calor), tipoDe)).toEqual({})
  })

  it("detecta campos que ya no existen en el catálogo", () => {
    const b: Bloque = {
      ...bloqueNuevo("tabla") as Extract<Bloque, { tipo: "tabla" }>,
      campos: ["documento", "borrado"],
    }
    expect(validarPlantilla(con(b), tipoDe)[`bloque:${b.id}:campos`]).toMatch(
      /borrado/,
    )
  })

  it("las medidas numéricas no aplican a campos de texto", () => {
    const b: Bloque = {
      ...bloqueNuevo("medidas") as Extract<Bloque, { tipo: "medidas" }>,
      campo: "prevision",
      medidas: ["conteo", "promedio"],
    }
    expect(validarPlantilla(con(b), tipoDe)).toHaveProperty(
      `bloque:${b.id}:medidas`,
    )
    expect(
      validarPlantilla(con({ ...b, medidas: ["conteo", "moda"] }), tipoDe),
    ).toEqual({})
  })

  it("el texto solo admite marcadores conocidos", () => {
    const b: Bloque = {
      ...bloqueNuevo("texto") as Extract<Bloque, { tipo: "texto" }>,
      texto: "Total {suma} y {desconocido}",
    }
    expect(validarPlantilla(con(b), tipoDe)[`bloque:${b.id}:texto`]).toMatch(
      /\{desconocido\}/,
    )
  })
})

describe("cambiarTipoGrafico", () => {
  it("limpia ejes que el nuevo tipo no usa", () => {
    const b = grafico({
      grafico: "barras_apiladas",
      campoX: "prevision",
      campoSerie: "seguro",
      agregacion: "suma",
      campoY: "monto",
    })
    expect(cambiarTipoGrafico(b, "barras")).toMatchObject({
      campoSerie: undefined,
      campoY: "monto",
      agregacion: "suma",
    })
    expect(cambiarTipoGrafico(b, "histograma")).toMatchObject({
      campoY: undefined,
      agregacion: "conteo",
    })
    const calor = cambiarTipoGrafico(b, "heatmap")
    expect(calor.campoX).toBe("__dia_semana")
    expect(cambiarTipoGrafico(calor, "barras").campoX).toBe("")
  })
})
