import { createApp } from "vue"
import App from "./App.vue"
import { crearRouter } from "./shell/router"
import { aplicarTema, temaGuardado } from "./application/tema"
import "./index.css"

// El tema claro es el predeterminado; se aplica antes de montar para evitar destellos.
aplicarTema(temaGuardado())

createApp(App).use(crearRouter()).mount("#root")
