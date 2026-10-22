import { describe, expect, it } from "vitest"
import { calcularMedidas, percentil } from "../stats"
import { redactarProsa } from "../prose"

describe("medidas estadísticas", () => {
  it("calcula las medidas mínimas", () => {
    const r = calcularMedidas(
      [10, 20, 20, 30, 40, null],
      [
        "conteo",
        "suma",
        "promedio",
        "mediana",
        "moda",
        "minimo",
        "maximo",
        "porcentaje",
        "variacion",
      ],
      { total: 6, anterior: [50, 10] },
    )
    expect(r).toMatchObject({
      conteo: 5,
      suma: 120,
      promedio: 24,
      mediana: 20,
      moda: 20,
      minimo: 10,
      maximo: 40,
      variacion: 100,
    })
    expect(r.porcentaje).toBeCloseTo(83.33, 1)
  })
  it("percentiles con interpolación lineal", () => {
    expect(percentil([1, 2, 3, 4], 25)).toBe(1.75)
  })
  it("redacta prosa parametrizada sin IA", () => {
    const t = redactarProsa(
      "Promedio de {campo}: {promedio} en {filas} filas.",
      {
        periodo: "2025",
        filas: 1200,
        pacientes: 300,
        campo: "Monto",
        esMonto: true,
        medidas: { promedio: 45000 },
      },
    )
    expect(t).toBe("Promedio de monto: $45.000 en 1.200 filas.")
  })
})
