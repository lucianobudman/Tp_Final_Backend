# Gestión de Peritos Informáticos

API REST con Express y Sequelize para administrar peritos, sus roles y los
intentos de acceso no autorizado. La configuración selecciona SQLite para
desarrollo y PostgreSQL para producción.

## Requisitos

- Node.js 20.17 o superior
- npm
- PostgreSQL si se ejecuta con el dialecto `postgres`

## Instalación y ejecución

```powershell
npm install
Copy-Item .env.example .env
```

Configure `API_KEY` en `.env` con un valor secreto propio y luego ejecute:

```powershell
npm start
```

El servidor crea las tablas que falten e inicializa los roles `ADMIN`,
`FORENSIC_INSPECTOR` y `AUDITOR`. Por defecto, SQLite guarda la base en
`data/peritos.sqlite`. Para producción, establezca `NODE_ENV=production` y
configure `DATABASE_URL` (o `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` y
`DB_NAME`). También puede seleccionar explícitamente el motor con
`DB_DIALECT=sqlite` o `DB_DIALECT=postgres`.

## Autenticación y auditoría

Todas las rutas de peritos requieren el header `x-api-key` con el valor de
`API_KEY`. Cada solicitud sin clave o con una clave inválida se registra en
`unauthorized_access_attempts`; si falla ese registro, la solicitud devuelve
un error 500 para no ocultar una falla de auditoría.

## ¿Qué hace cada parte del código?

El proyecto separa el arranque del servidor, la conexión a la base de datos,
los modelos, las rutas, los controladores y el middleware de autenticación.
Así, cada módulo tiene una responsabilidad concreta y la misma lógica de
peritos funciona tanto con SQLite como con PostgreSQL.

### Archivos principales

| Archivo | Responsabilidad |
| --- | --- |
| `src/server.js` | Es el punto de entrada. Carga `.env`, comprueba que exista `API_KEY`, crea la conexión y los modelos, verifica la conexión con la base, crea las tablas que falten e inserta los roles requeridos si todavía no existen. Finalmente, inicia Express y cierra el servidor y Sequelize ordenadamente al recibir `SIGINT` o `SIGTERM`. |
| `src/app.js` | Configura la aplicación Express. Morgan registra las solicitudes HTTP y monta las rutas de peritos en `/api/v1/peritos`. También concentra el manejo de errores: el JSON mal formado o demasiado grande se devuelve como `400` o `413`, respectivamente; los errores inesperados se registran en rojo con Chalk y responden `500`. |
| `src/config/database.js` | Crea la instancia de Sequelize según las variables de entorno. Usa SQLite por defecto fuera de producción y PostgreSQL por defecto en producción. Acepta una `DATABASE_URL` o parámetros separados para PostgreSQL y permite habilitar SSL con `DB_SSL=true`. Si recibe un dialecto no soportado, informa el error en vez de continuar con una configuración incorrecta. |
| `src/models/index.js` | Define los modelos Sequelize y sus tablas. `Role` representa `roles`; `User`, `users`; y `AuditLog`, `unauthorized_access_attempts`, que conserva cada solicitud rechazada por autenticación. También declara la relación entre usuario y rol, utilizada para incluir la información del rol en las respuestas. |
| `src/routes/peritos.js` | Declara las rutas HTTP y las conecta con los métodos del controlador: crear, listar, consultar por ID y dar de baja. Primero aplica el middleware de API key; después habilita la lectura del JSON y atiende las rutas. |
| `src/controllers/peritosController.js` | Contiene la lógica de negocio. Valida username y rol al crear, traduce usernames duplicados a `409`, hace la baja lógica actualizando `active`, lista solo usuarios activos y permite filtrar por nombre de rol. Las consultas incluyen el rol asociado. Los errores que no puede resolver se envían al manejador central de Express. |
| `src/middleware/apiKeyAuth.js` | Protege las rutas comparando `x-api-key` con `API_KEY` mediante una comparación de tiempo constante. Si la clave falta o no coincide, guarda método, ruta, IP, motivo y fecha en la tabla de auditoría y responde `401`. Si no puede guardar la auditoría, propaga el error para informar el fallo. |
| `test/peritos.test.js` | Prueba el comportamiento de la API usando SQLite en memoria: selección de dialecto, autenticación y auditoría, alta, duplicados, filtro por rol, validaciones y baja lógica. |
| `package.json` | Declara las dependencias y los comandos disponibles: `npm start` para producción, `npm run dev` para desarrollo con reinicio al detectar cambios y `npm test` para las pruebas. |
| `.env.example` | Muestra las variables de entorno esperadas. Se copia como `.env` para configurar el entorno local; el archivo `.env` no se versiona. |
| `.gitignore` | Evita incluir en Git dependencias instaladas, archivos de entorno, bases SQLite locales y resultados temporales de pruebas. |

### Modelos y datos

- **`roles`** tiene un identificador y un nombre de rol único. En el arranque se
  aseguran los registros `ADMIN`, `FORENSIC_INSPECTOR` y `AUDITOR`.
- **`users`** tiene un identificador, un `username` único, `role_id` como clave
  foránea a `roles`, `active` como indicador de baja lógica y `created_at` con
  la fecha de creación automática.
- **`unauthorized_access_attempts`** conserva los intentos sin autenticar.
  Esta tabla es adicional a las requeridas para poder realizar la auditoría
  solicitada.

La aplicación nunca elimina físicamente un perito: `DELETE` cambia `active` a
`false`. Por eso, los listados y las consultas por ID excluyen a los peritos
dados de baja.

### Recorrido de una solicitud

1. `src/server.js` inicia la aplicación y conecta Sequelize con el motor
   configurado.
2. `src/app.js` registra la petición con Morgan y la envía al router.
3. `src/routes/peritos.js` aplica autenticación antes de aceptar la operación.
   Si la clave es inválida, el middleware la audita y detiene el recorrido.
4. Si está autenticada, el router dirige la solicitud al controlador
   correspondiente.
5. El controlador valida los datos, realiza la operación mediante los modelos
   Sequelize y devuelve la respuesta HTTP.
6. Si ocurre un error inesperado, el controlador lo propaga al manejador de
   errores de `src/app.js`, que lo registra y responde con `500`.

## Endpoints

Todas las solicitudes deben enviar `x-api-key`.

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/api/v1/peritos` | Crear un perito con `username` y `role_id` |
| `DELETE` | `/api/v1/peritos/:id` | Dar de baja lógicamente un perito |
| `GET` | `/api/v1/peritos` | Listar peritos activos; admite `?role=ADMIN` |
| `GET` | `/api/v1/peritos/:id` | Obtener un perito activo |

Ejemplo de creación:

```json
{
  "username": "ana",
  "role_id": 1
}
```

Los endpoints de lectura incluyen el rol asociado. Los errores de validación
responden con `400`, los usernames duplicados con `409` y los peritos
inexistentes o inactivos con `404`. Morgan registra las peticiones HTTP y los
mensajes de consola usan Chalk para altas y validaciones.

## Pruebas

```powershell
npm test
```
