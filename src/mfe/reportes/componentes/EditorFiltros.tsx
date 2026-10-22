import { useEffect, useState } from "react"
import { FolderPlus, Plus, X } from "lucide-react"
import { useServicios, useUsuario } from "@/application"
import type { ColumnaCatalogo, TipoCampo } from "@/domain/model"
import {
  ETIQUETAS_OPERADOR,
  OPERADORES_POR_TIPO,
  describirFiltro,
  grupoVacio,
  nuevoId,
  type Condicion,
  type Grupo,
  type Operador,
} from "@/domain/filters"
import {
  Boton,
  Entrada,
  Segmentado,
  Selector,
  SelectorMultiple,
  cn,
} from "@/shared/ui"

const tipoDe = (columnas: ColumnaCatalogo[], campo: string): TipoCampo =>
  columnas.find((c) => c.clave === campo)?.tipo ?? "texto"

export function EditorFiltros({
  grupo,
  alCambiar,
  columnas,
}: {
  grupo: Grupo
  alCambiar: (g: Grupo) => void
  columnas: ColumnaCatalogo[]
}) {
  const etiqueta = (c: string) =>
    columnas.find((x) => x.clave === c)?.etiqueta ?? c
  return (
    <div className="space-y-3">
      <EditorGrupo
        grupo={grupo}
        alCambiar={alCambiar}
        columnas={columnas}
        nivel={0}
      />
      <p className="rounded-lg bg-superficie-2 px-3.5 py-2.5 text-[13px] text-suave">
        {describirFiltro(grupo, etiqueta)}
      </p>
    </div>
  )
}

function EditorGrupo({
  grupo,
  alCambiar,
  alQuitar,
  columnas,
  nivel,
}: {
  grupo: Grupo
  alCambiar: (g: Grupo) => void
  alQuitar?: () => void
  columnas: ColumnaCatalogo[]
  nivel: number
}) {
  const fijarHijo = (i: number, h: Condicion | Grupo) =>
    alCambiar({ ...grupo, hijos: grupo.hijos.map((x, j) => (j === i ? h : x)) })
  const quitarHijo = (i: number) =>
    alCambiar({ ...grupo, hijos: grupo.hijos.filter((_, j) => j !== i) })
  const agregarCondicion = () => {
    const campo = columnas[0]?.clave ?? "documento"
    alCambiar({
      ...grupo,
      hijos: [
        ...grupo.hijos,
        {
          id: nuevoId(),
          tipo: "condicion",
          campo,
          operador: OPERADORES_POR_TIPO[tipoDe(columnas, campo)][0],
        },
      ],
    })
  }

  return (
    <div
      className={cn(
        nivel > 0 && "rounded-xl border border-borde bg-superficie-2/60 p-3",
      )}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[13px] text-suave">
        <span>{nivel === 0 ? "Incluir filas que cumplan" : "Que cumplan"}</span>
        <Segmentado
          tamano="sm"
          etiqueta="Unión de condiciones"
          valor={grupo.union}
          alCambiar={(union) => alCambiar({ ...grupo, union })}
          opciones={[
            { valor: "Y", etiqueta: "todas" },
            { valor: "O", etiqueta: "alguna" },
          ]}
        />
        <span>de estas condiciones:</span>
        {alQuitar && (
          <Boton
            tamano="sm"
            variante="fantasma"
            soloIcono
            className="ml-auto"
            aria-label="Quitar grupo"
            icono={<X className="size-3.5" />}
            onClick={alQuitar}
          />
        )}
      </div>
      <div className="space-y-2">
        {grupo.hijos.map((h, i) =>
          h.tipo === "grupo" ? (
            <EditorGrupo
              key={h.id}
              grupo={h}
              columnas={columnas}
              nivel={nivel + 1}
              alCambiar={(g) => fijarHijo(i, g)}
              alQuitar={() => quitarHijo(i)}
            />
          ) : (
            <FilaCondicion
              key={h.id}
              c={h}
              columnas={columnas}
              alCambiar={(c) => fijarHijo(i, c)}
              alQuitar={() => quitarHijo(i)}
            />
          ),
        )}
        {!grupo.hijos.length && (
          <p className="text-[12.5px] text-tenue">Sin condiciones.</p>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <Boton
          tamano="sm"
          variante="fantasma"
          icono={<Plus className="size-3.5" />}
          onClick={agregarCondicion}
        >
          Condición
        </Boton>
        {nivel < 2 && (
          <Boton
            tamano="sm"
            variante="fantasma"
            icono={<FolderPlus className="size-3.5" />}
            onClick={() =>
              alCambiar({
                ...grupo,
                hijos: [
                  ...grupo.hijos,
                  { ...grupoVacio(grupo.union === "Y" ? "O" : "Y") },
                ],
              })
            }
          >
            Grupo
          </Boton>
        )}
      </div>
    </div>
  )
}

function FilaCondicion({
  c,
  columnas,
  alCambiar,
  alQuitar,
}: {
  c: Condicion
  columnas: ColumnaCatalogo[]
  alCambiar: (c: Condicion) => void
  alQuitar: () => void
}) {
  const tipo = tipoDe(columnas, c.campo)
  const operadores = OPERADORES_POR_TIPO[tipo]
  const tipoEntrada =
    tipo === "fecha" ? "date" : tipo === "hora" ? "time" : "text"
  const sinValor = c.operador === "vacio" || c.operador === "no_vacio"

  const cambiarCampo = (campo: string) => {
    const ops = OPERADORES_POR_TIPO[tipoDe(columnas, campo)]
    alCambiar({
      id: c.id,
      tipo: "condicion",
      campo,
      operador: ops.includes(c.operador) ? c.operador : ops[0],
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Selector
        className="w-48"
        value={c.campo}
        onChange={(e) => cambiarCampo(e.target.value)}
        aria-label="Campo"
      >
        {!columnas.some((x) => x.clave === c.campo) && (
          <option value={c.campo}>{c.campo}</option>
        )}
        {columnas.map((x) => (
          <option key={x.clave} value={x.clave}>
            {x.etiqueta}
          </option>
        ))}
      </Selector>
      <Selector
        className="w-40"
        value={c.operador}
        onChange={(e) =>
          alCambiar({ ...c, operador: e.target.value as Operador })
        }
        aria-label="Operador"
      >
        {operadores.map((o) => (
          <option key={o} value={o}>
            {ETIQUETAS_OPERADOR[o]}
          </option>
        ))}
      </Selector>
      {c.operador === "en_lista" ? (
        <ValoresLista
          campo={c.campo}
          valores={c.valores ?? []}
          alCambiar={(valores) => alCambiar({ ...c, valores })}
        />
      ) : (
        !sinValor && (
          <>
            <Entrada
              className="w-40"
              type={tipoEntrada}
              inputMode={
                tipo === "numero" || tipo === "monto" ? "decimal" : undefined
              }
              value={c.valor ?? ""}
              onChange={(e) => alCambiar({ ...c, valor: e.target.value })}
              aria-label="Valor"
              placeholder="Valor"
            />
            {c.operador === "entre" && (
              <>
                <span className="text-[13px] text-tenue">y</span>
                <Entrada
                  className="w-40"
                  type={tipoEntrada}
                  value={c.valor2 ?? ""}
                  onChange={(e) => alCambiar({ ...c, valor2: e.target.value })}
                  aria-label="Hasta"
                  placeholder="Hasta"
                />
              </>
            )}
          </>
        )
      )}
      <Boton
        variante="fantasma"
        soloIcono
        aria-label="Quitar condición"
        icono={<X className="size-3.5" />}
        onClick={alQuitar}
      />
    </div>
  )
}

function ValoresLista({
  campo,
  valores,
  alCambiar,
}: {
  campo: string
  valores: string[]
  alCambiar: (v: string[]) => void
}) {
  const s = useServicios()
  const { token } = useUsuario()
  const [opciones, setOpciones] = useState<string[]>([])
  useEffect(() => {
    let vigente = true
    s.datos.valoresDistintos(token, campo).then(
      (v) => vigente && setOpciones(v),
      () => vigente && setOpciones([]),
    )
    return () => {
      vigente = false
    }
  }, [s, token, campo])
  return (
    <SelectorMultiple
      className="min-w-56 flex-1"
      valores={valores}
      opciones={[...new Set([...opciones, ...valores])].map((v) => ({
        valor: v,
        etiqueta: v,
      }))}
      alCambiar={alCambiar}
      permitirLibre
      marcador="Elegir valores…"
    />
  )
}
