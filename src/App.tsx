import { useState } from "react"
import { RouterProvider } from "react-router"
import { ProveedorServicios, ProveedorSesion } from "@/application"
import { ProveedorToasts } from "@/shared/ui"
import { PantallaCarga, PantallaError } from "@/shell/estados"
import { crearRouter } from "@/shell/router"

function Enrutador() {
  const [router] = useState(crearRouter)
  return <RouterProvider router={router} />
}

export default function App() {
  return (
    <ProveedorToasts>
      <ProveedorServicios
        cargando={
          <div className="flex min-h-screen">
            <PantallaCarga />
          </div>
        }
        error={(m, r) => <PantallaError mensaje={m} reintentar={r} />}
      >
        <ProveedorSesion>
          <Enrutador />
        </ProveedorSesion>
      </ProveedorServicios>
    </ProveedorToasts>
  )
}
