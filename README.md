**FRONTEND**

AUTH CONTROLLER

- POST /api/auth/register -> Crea una nueva cuenta de usuario en el sistema.
- POST /api/auth/login -> Valida las credenciales y devuelve los datos de autenticación.


**BACKEND**

USER CONTROLLER

- GET /api/users -> Obtiene la lista completa de todos los usuarios registrados.
- GET /api/users/{id} -> Recupera la información detallada de un usuario específico.

- POST /api/users -> Endpoint administrativo para crear un usuario manualmente.
- POST /api/users/bulk -> Creación masiva de registros de usuario en una sola transacción.

- DELETE /api/users/{id} -> Eliminación permanente de una cuenta de usuario de la base de datos.


EXPENSE CONTROLLER

- GET /api/expenses -> Lista todos los gastos registrados en el sistema.
- GET /api/expenses/{id} -> Recupera los detalles de una entrada de gasto específica.

- POST /api/expenses/user/{userId} -> Registra un nuevo gasto vinculado a un usuario específico.

- DELETE /api/expenses/{id} -> Elimina una entrada de gasto mediante su identificador único.


CATEGORY CONTROLLER

- GET /api/categories -> Lista todas las categorías de gastos disponibles.
- GET /api/categories/{id} -> Obtiene la definición de una categoría específica.

- POST /api/categories -> Crea una nueva categoría (ej. "Comida", "Tecnología").
- POST /api/categories/bulk -> Importación masiva de múltiples categorías.

- DELETE /api/categories/{id} -> Elimina la definición de una categoría.



**LOGIN** !


<img width="1919" height="964" alt="image" src="https://github.com/user-attachments/assets/cbcbb214-8f7f-45cf-90f2-6413aa34e1c4" />


**REGISTER** !

<img width="1919" height="962" alt="image" src="https://github.com/user-attachments/assets/701037a1-c5b9-4353-be18-393ce87b1c55" />







Para poder usar:

### Stack
- Backend: **Go 1.23** + Gin + GORM + PostgreSQL (imagen ~41 MB, RAM ~7 MB)
- Frontend: React 19 + Vite 7 + pnpm 11 (imagen nginx 102 MB)
- DB: postgres:16

### Opción A — Todo con Docker (recomendado)
```bash
docker compose up --build
```
- Frontend: http://localhost:5173 (nginx proxy /api → backend)
- Backend: http://localhost:8080 (GET /health)
- Postgres: localhost:5532

### Opción B — Desarrollo local
```bash
# Terminal 1 - DB (usa .env)
docker compose up postgres -d

# Terminal 2 - Backend Go (lee .env automáticamente vía compose, local requiere export)
# crea .env en la raíz con POSTGRES_* y DATABASE_URL (no se commitea)
go run ./cmd/server  # http://localhost:8080, lee .env / DATABASE_URL
```

# Terminal 3 - Frontend
cd frontend
pnpm install
pnpm dev  # http://localhost:5173 proxy /api -> 8080
```

Comandos útiles:
- `docker compose down` / `docker compose down -v` (borra volumen DB)
- `docker compose logs -f backend` / `docker compose logs -f frontend`
- `docker stats --no-stream` (consumo: backend ~7 MB vs Spring ~304 MB)
  
