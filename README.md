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

