# MyLife PWA

App de productividad personal con IA. Presupuesto, recetas, lista de la compra, planificador de menús, tareas y hábitos.

## Stack

- **React 18** + **TypeScript** + **Vite**
- **vite-plugin-pwa** — Service Worker, offline, instalable
- Sin dependencias UI externas — CSS puro con variables

## Instalación

```bash
npm install
npm run dev
```

## Build y deploy

```bash
npm run build
# Sube la carpeta /dist a Vercel, Netlify o cualquier hosting estático
```

### Deploy en Vercel (recomendado)

1. Sube este proyecto a GitHub
2. Ve a [vercel.com](https://vercel.com) → New Project → importa el repo
3. Vercel detecta Vite automáticamente → Deploy
4. Listo ✅

### Deploy en Netlify

```bash
npm run build
# Arrastra la carpeta /dist a app.netlify.com/drop
```

## Configuración de IA

En la app, ve a **Config** e introduce tu clave API:

- **Claude** (recomendado): `sk-ant-api03-...` — funciona directamente desde el navegador
- **OpenAI**: `sk-proj-...` — usa un proxy CORS automático

Las claves se guardan **solo en tu dispositivo** (localStorage), nunca se envían a servidores externos.

## Funcionalidades

| Módulo | Descripción |
|---|---|
| Dashboard | Resumen diario, diferencial presupuesto, hábitos y tareas |
| Presupuesto | Objetivo mensual, diferencial diario y acumulado, gráfico por categorías |
| Recetas IA | Generación con Claude/OpenAI, guardado, añadir a la compra |
| Lista compra | Manual + desde recetas/menús, tachado |
| Planificador | Vista semanal desayuno/comida/cena, navegación semanas |
| Tareas | Prioridades, fechas límite, categorías, filtros |
| Hábitos | Racha 🔥, histórico 14 días, check diario |
| Config | Proveedor IA, claves API, notificaciones push, export/import |

## PWA

- Instalable en móvil (Add to Home Screen)
- Modo offline con Service Worker
- Datos persistentes en localStorage
