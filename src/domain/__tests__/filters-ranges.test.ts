import { describe, expect, it } from "vitest"
import { evaluarFiltro, grupoVacio, type Grupo } from "../filters"
import {
  bloqueVacio,
  describirRango,
  evaluarRango,
  rangoValido,
  type RangoFechas,
} from "../ranges"
import type { TipoCampo } from "../model"

const tipos: Record<string, TipoCampo> = {
  prevision: "texto",
  monto: "monto",
  fecha_registro: "fecha",
  documento: "documento",
}
const tipoDe = (c: string) => tipos[c] ?? "texto"

describe("constructor de filtros", () => {
  const r = {
    prevision: "Fonasa B",
    monto: 45000,
    fecha_registro: "2025-03-04T10:00",
    documento: "12345678-5",
  }

  it("un grupo vacío deja pasar todo", () => {
    expect(evaluarFiltro(grupoVacio(), r, tipoDe)).toBe(true)
  })

  it("evalúa grupos anidados Y/O con operadores por tipo", () => {
    const g: Grupo = {
      id: "g",
      tipo: "grupo",
      union: "Y",
      hijos: [
        {
          id: "c1",
          tipo: "condicion",
          campo: "prevision",
          operador: "contiene",
          valor: "FONASA",
        },
        {
          id: "g2",
          tipo: "grupo",
          union: "O",
          hijos: [
            {
              id: "c2",
              tipo: "condicion",
              campo: "monto",
              operador: "mayor",
              valor: "100000",
            },
            {
              id: "c3",
              tipo: "condicion",
              campo: "fecha_registro",
              operador: "entre",
              valor: "2025-03-01",
              valor2: "2025-03-31",
            },
          ],
        },
      ],
    }
    expect(evaluarFiltro(g, r, tipoDe)).toBe(true)
    expect(
      evaluarFiltro(g, { ...r, fecha_registro: "2025-04-01" }, tipoDe),
    ).toBe(false)
  })

  it("filtra por RUN aunque se escriba con puntos", () => {
    const g: Grupo = {
      id: "g",
      tipo: "grupo",
      union: "Y",
      hijos: [
        {
          id: "c",
          tipo: "condicion",
          campo: "documento",
          operador: "igual",
          valor: "12.345.678-5",
        },
      ],
    }
    expect(evaluarFiltro(g, r, tipoDe)).toBe(true)
  })

  it("operadores vacío y en lista", () => {
    const vacio: Grupo = {
      id: "g",
      tipo: "grupo",
      union: "Y",
      hijos: [
        { id: "c", tipo: "condicion", campo: "seguro", operador: "vacio" },
      ],
    }
    expect(evaluarFiltro(vacio, r, tipoDe)).toBe(true)
    const lista: Grupo = {
      id: "g",
      tipo: "grupo",
      union: "Y",
      hijos: [
        {
          id: "c",
          tipo: "condicion",
          campo: "prevision",
          operador: "en_lista",
          valores: ["Isapre", "fonasa b"],
        },
      ],
    }
    expect(evaluarFiltro(lista, r, tipoDe)).toBe(true)
  })
})

describe("rangos de fechas con Y/O y exclusiones", () => {
  const primerTrimestreHabil: RangoFechas = {
    bloques: [
      { ...bloqueVacio("incluir"), anios: [2025], meses: [1, 2, 3] },
      {
        ...bloqueVacio("incluir", "Y"),
        diasSemana: [1, 2, 3, 4, 5],
        horaDesde: "09:00",
        horaHasta: "18:00",
      },
      { ...bloqueVacio("excluir"), fechas: ["2025-03-25"] },
    ],
  }

  it("requiere al menos un bloque de inclusión con criterios", () => {
    expect(rangoValido({ bloques: [bloqueVacio()] })).toBe(false)
    expect(rangoValido(primerTrimestreHabil)).toBe(true)
  })

  it("combina con Y y aplica las exclusiones al final", () => {
    expect(evaluarRango(primerTrimestreHabil, "2025-03-04T10:00")).toBe(true) // martes
    expect(evaluarRango(primerTrimestreHabil, "2025-03-08T10:00")).toBe(false) // sábado
    expect(evaluarRango(primerTrimestreHabil, "2025-03-04T18:00")).toBe(false) // fuera de horario
    expect(evaluarRango(primerTrimestreHabil, "2025-03-25T10:00")).toBe(false) // excluido
    expect(evaluarRango(primerTrimestreHabil, "2025-04-01T10:00")).toBe(false)
  })

  it("sin hora no cumple un bloque con horario", () => {
    expect(evaluarRango(primerTrimestreHabil, "2025-03-04")).toBe(false)
  })

  it("O entre bloques; Y tiene precedencia sobre O", () => {
    const r: RangoFechas = {
      bloques: [
        { ...bloqueVacio("incluir"), anios: [2024], meses: [12] },
        { ...bloqueVacio("incluir", "O"), anios: [2025] },
        { ...bloqueVacio("incluir", "Y"), meses: [1] },
      ],
    }
    // (2024 dic) O (2025 Y enero)
    expect(evaluarRango(r, "2024-12-10")).toBe(true)
    expect(evaluarRango(r, "2025-01-10")).toBe(true)
    expect(evaluarRango(r, "2025-02-10")).toBe(false)
  })

  it("semanas del mes y trimestres", () => {
    const r: RangoFechas = {
      bloques: [
        { ...bloqueVacio("incluir"), trimestres: [1], semanasMes: [1] },
      ],
    }
    expect(evaluarRango(r, "2025-03-02")).toBe(true)
    expect(evaluarRango(r, "2025-03-03")).toBe(false)
  })

  it("resume en lenguaje natural", () => {
    expect(describirRango(primerTrimestreHabil)).toBe(
      "Se incluirán: enero a marzo de 2025 y además solo lunes a viernes, de 09:00 a 18:00; se excluye el día 25-03-2025.",
    )
  })
})
