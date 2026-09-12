# Expense Tracker — Personal minimalista indie

> Guarda cada compra, ve cuánto te queda y en qué se va tu plata. Tracker brutalista, rápido y tuyo.

![CI](https://github.com/bulletformyvalentinefan/expense-tracker/actions/workflows/ci.yml/badge.svg) ![Go 1.26](https://img.shields.io/badge/go-1.26-00ADD8) ![pnpm 11](https://img.shields.io/badge/pnpm-11-F69220) ![Docker](https://img.shields.io/badge/docker-compose-3%20services-2496ED)

### ¿Qué es y para quién?
App personal minimalista indie para **controlar gastos diarios sin SaaS**. Creas categorías (`Comida`, `Viajes`, `Tech`), registras compras con monto/descripción/fecha, y ves al instante:
- **Saldo actual = saldo inicial − gastado** (barra `70%` → rojo cuando <15%)
- **Descuento por categoría** (`Food $320 — 42% — 4 compras`)
- **Historial real** con `date` agrupado por día, filtros y totales.

Sin multi-tenant pesado: un usuario = una billetera. Datos tuyos en `postgres_data`.

**LOGIN !**

<img width="1919" height="964" alt="image" src="https://github.com/user-attachments/assets/cbcbb214-8f7f-45cf-90f2-6413aa34e1c4" />

**REGISTER !**

<img width="1919" height="962" alt="image" src="https://github.com/user-attachments/assets/701037a1-c5b9-4353-be18-393ce87b1c55" />

### Features
- **Auth** `POST /api/auth/register` `POST /api/auth/login` BasicAuth `internal/middleware/basic_auth.go:15`
- **Billetera** `PUT /api/users/:id/balance` y `GET /api/users/:id/balance` → `{startingBalance, totalSpent, currentBalance}`
- **Categorías** `POST/GET/DELETE /api/categories` + `POST /bulk`, al vuelo en `Dashboard.jsx:40` (desbloquea crear gasto)
- **Gastos** `POST /api/expenses/:id` `GET /api/expenses` `GET /api/users/:id/expenses?from=&to=&categoryId=&page=&limit=` `DELETE`, con `amount>0` y `date` opcional
- **Resumen** `GET /api/users/:id/summary/categories` → `[{id,name,totalSpent,count}]`
- **Frontend** `BalanceCard` (inicio/gastado/saldo + barra), `CategoryBreakdown` pills con %, `Timeline` agrupado por fecha, `Search/Sort`

### Stack
| Capa | Tec | Imagen | RAM |
|------|-----|--------|-----|
| Backend | **Go 1.26** `gin+gorm` `cmd/server/main.go:18` | `41MB` `golang:1.26-alpine → alpine:3.20` | `~7MB` |
| Frontend | **React 19** `vite 7` `pnpm 11` | `102MB` `node:24-alpine → nginx:alpine` | `~8MB` |
| DB | **postgres:16** `compose.yaml:3` | `642MB` | `~38MB` |

### API (contrato real, no `README` viejo)
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/auth/register` | no | `{name,email,password,startingBalance?}` → `UserDto` |
| POST | `/api/auth/login` | Basic | `Authorization: Basic base64(email:pass)` → `UserDto` |
| GET | `/api/auth/me` | Basic | usuario actual |
| GET | `/api/users` | Basic | lista usuarios |
| GET | `/api/users/:id` | Basic | detalle |
| PUT | `/api/users/:id/balance` | Basic | `{startingBalance}` |
| GET | `/api/users/:id/balance` | Basic | `{startingBalance,totalSpent,currentBalance}` |
| GET | `/api/users/:id/expenses?from=&to=&categoryId=&page=&limit=` | Basic | historial por usuario paginado |
| GET | `/api/users/:id/summary/categories` | Basic | gasto por categoría |
| POST | `/api/categories` | Basic | `{name,description?}` |
| POST | `/api/categories/bulk` | Basic | `[...]` |
| GET | `/api/categories` | Basic | `[]` |
| DELETE | `/api/categories/:id` | Basic | `204/409` si en uso |
| POST | `/api/expenses/:id` | Basic | `id=userId` `{amount>0,description,categoryId,date?}` |
| GET | `/api/expenses` | Basic | todos (legacy) |
| DELETE | `/api/expenses/:id` | Basic |  |

### Quick start

#### Opción A — Todo Docker (recomendado)
```bash
# crea .env en raíz (no se commitea, ver .env con POSTGRES_* y DATABASE_URL)
docker compose up --build
# Frontend http://localhost:5173  Backend http://localhost:8080/health  Postgres localhost:5532
```

#### Opción B — Local
```bash
docker compose up postgres -d   # usa .env
go run ./cmd/server             # lee .env vía godotenv, http://localhost:8080
# en otra terminal
cd frontend && pnpm install && pnpm dev  # http://localhost:5173 proxy /api→8080
```

Comandos: `make test` `make lint` `make ci` `docker compose logs -f backend` `docker stats --no-stream`

### Config `.env` (secreto, ignorado)
```
POSTGRES_DB=expense-tracker
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
DATABASE_URL=host=postgres user=postgres password=postgres dbname=expense-tracker port=5432 sslmode=disable TimeZone=UTC
PORT=8080
```

### Roadmap indie
- Presupuesto mensual por categoría con alerta 80%
- `CSV` import/export y `SavingsGoalWidget`
- Gráfica sparkline sin lib pesada
