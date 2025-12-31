Expense Tracker API
Este proyecto consiste en una interfaz de programación de aplicaciones (API) diseñada para la gestión y seguimiento de gastos financieros personales. La solución ha sido desarrollada bajo el ecosistema de Spring Boot, priorizando la escalabilidad, la seguridad y el cumplimiento de las mejores prácticas de desarrollo backend.

Tecnologías Implementadas
El sistema integra las siguientes tecnologías y herramientas de desarrollo:

Lenguaje de programación: Java 21 (JDK 21).

Framework principal: Spring Boot 3.5.x.

Gestión de persistencia: Spring Data JPA con soporte para PostgreSQL y Oracle Database.

Seguridad: Spring Security con configuración para autenticación básica y manejo de sesiones.

Documentación de API: OpenAPI 3.0 mediante la integración de Springdoc-OpenAPI (Swagger UI).

Gestión de dependencias: Apache Maven.

Pruebas unitarias: JUnit 5 y Mockito para la validación de la lógica de negocio.

Arquitectura del Sistema
La aplicación se fundamenta en una arquitectura multicapa, lo que garantiza una separación clara de responsabilidades:

Capa de Controladores (Controller): Gestiona las peticiones HTTP y define los puntos de entrada de la API.

Capa de Servicios (Service): Implementa la lógica de negocio, validaciones de dominio y orquestación de procesos.

Capa de Persistencia (Repository): Administra la interacción con la base de datos a través de abstracciones de Spring Data.

Capa de Modelos (Entity/DTO): Define las entidades de persistencia y los objetos de transferencia de datos para la comunicación externa.

Manejo de Excepciones: Se ha implementado un componente global de gestión de errores (@RestControllerAdvice) que estandariza las respuestas ante fallos de validación o recursos no encontrados.

Instalación y Configuración
Para la correcta ejecución del entorno de desarrollo, se deben seguir los siguientes pasos: