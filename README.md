# Banking API — Testing Practice

API bancaria simulada construida con **Node.js + Express + SQLite (better-sqlite3)**,
pensada como entorno de práctica para testers que quieren aprender a probar APIs con
**Postman**, desde pruebas manuales hasta colecciones automatizadas.

No depende de ningún servicio externo: la base de datos es un único archivo local
(`bank.db`) que se crea solo la primera vez que arrancas el servidor.

---

## 1. Instalación

```bash
git clone <tu-repo>
cd banking-api
npm install
cp .env.example .env
npm start
```

Al iniciar por primera vez verás en consola las credenciales del super usuario (admin),
tomadas de tu `.env`:

```
usuario:  admin
password: Admin123!
```

El servidor queda escuchando en `http://localhost:3000`.

Para reiniciar el estado de la base de datos (borrar todos los usuarios y volver a
crear solo el admin):

```bash
npm run reset-db
npm start
```

---

## 2. Frontend incluido

El proyecto incluye un frontend simple (HTML/CSS/JS plano, sin frameworks) servido
por el mismo Express en `public/`. Al abrir `http://localhost:3000` en el navegador
verás:

- Login.
- **Mi cuenta**: saldo propio y perfil.
- **Transferir**: formulario para enviar dinero a otra cuenta.
- **Administración** (solo visible si entras como `admin`): crear usuarios con
  saldo inicial y ver la lista completa de usuarios registrados.

Es útil para hacer pruebas manuales de UI además de las pruebas de API con
Postman — ambas hablan con los mismos endpoints.

---

## 3. Endpoints disponibles

| Método | Ruta                          | Auth requerida | Rol       | Descripción                                   |
|--------|-------------------------------|----------------|-----------|------------------------------------------------|
| POST   | `/api/auth/login`             | No             | -         | Autentica y devuelve un JWT                     |
| POST   | `/api/users`                  | Sí             | admin     | Crea un usuario nuevo con saldo inicial         |
| GET    | `/api/users`                  | Sí             | admin     | Lista todos los usuarios                        |
| GET    | `/api/users/me`                | Sí             | cualquiera| Perfil del usuario autenticado                  |
| GET    | `/api/users/:username/balance`| Sí             | cualquiera| Consulta saldo (propio, o cualquiera si eres admin) |
| POST   | `/api/transfer`               | Sí             | cualquiera| Transfiere dinero entre dos cuentas             |

La autenticación se hace enviando el token en el header:

```
Authorization: Bearer <token>
```

### Ejemplo: login

```
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "Admin123!"
}
```

### Ejemplo: crear usuario (con el token del admin)

```
POST http://localhost:3000/api/users
Authorization: Bearer <token_admin>
Content-Type: application/json

{
  "username": "juan",
  "password": "Juan123!",
  "initialBalance": 500
}
```

### Ejemplo: transferencia

```
POST http://localhost:3000/api/transfer
Authorization: Bearer <token_juan>
Content-Type: application/json

{
  "fromUsername": "juan",
  "toUsername": "admin",
  "amount": 50
}
```

---

## 4. Colección de Postman incluida

En `postman/Banking_API.postman_collection.json` ya tienes una colección lista para
importar en Postman (File → Import). Incluye:

- Login de admin y de usuario normal, con un **script de test** que guarda el token
  automáticamente en variables de colección (`adminToken`, `userToken`).
- Creación y listado de usuarios.
- Consulta de saldo y perfil.
- Una transferencia exitosa y dos casos negativos ya armados (fondos insuficientes,
  destino inexistente).

Solo cambia la variable `baseUrl` si tu servidor corre en otro puerto.

---

## 5. Ruta de aprendizaje sugerida como tester

Este proyecto está pensado para recorrerse en fases, cada una un poco más avanzada
que la anterior. No hace falta ninguna herramienta adicional a Postman.

**Fase 1 — Exploración manual**
Levanta el servidor y prueba cada endpoint a mano en Postman, sin scripts.
Objetivo: entender qué devuelve cada ruta en el caso feliz (happy path).

**Fase 2 — Casos negativos**
Para cada endpoint, prueba deliberadamente lo que "no debería funcionar": login con
password incorrecta, crear un usuario que ya existe, transferir más saldo del que
tienes, transferir a un usuario que no existe, transferirte a ti mismo, llamar a
rutas de admin con el token de un usuario normal, o sin token. Verifica que el
código de estado HTTP y el mensaje de error sean coherentes.

**Fase 3 — Variables y encadenado de peticiones**
Usa variables de colección/entorno en vez de pegar tokens a mano: guarda el token
que devuelve `/login` y reutilízalo en las siguientes peticiones. Esto es lo que ya
hace la colección incluida — revisa la pestaña "Tests" del request de login para ver
cómo se hace con `pm.collectionVariables.set(...)`.

**Fase 4 — Aserciones automatizadas (pm.test)**
Añade tus propios `pm.test()` a cada request: código de estado esperado, forma del
JSON de respuesta, que el saldo baje/suba exactamente el monto transferido, etc.

**Fase 5 — Flujos completos (test end-to-end)**
Arma una secuencia de requests en un mismo Collection Runner: login admin → crear
usuario → login del usuario nuevo → consultar saldo → transferir → volver a
consultar saldo y verificar que cambió lo esperado.

**Fase 6 — Casos de seguridad**
Revisa qué pasa si intentas acceder a rutas de admin con un JWT manipulado, expirado,
o directamente sin el header `Authorization`. Es un buen ejercicio para entender por
qué el middleware `verifyToken`/`requireAdmin` existe y qué protege.

Cuando te sientas cómodo con todo lo anterior, el siguiente paso natural (fuera del
alcance de este proyecto) sería correr la colección con **Newman** desde línea de
comandos para integrarla en un pipeline de CI.

---

## 6. Estructura del proyecto

```
banking-api/
├── .env.example
├── .gitignore
├── database.js          # Conexión SQLite + creación de tablas + seed del admin
├── server.js             # Configuración de Express y montaje de rutas
├── middleware/
│   └── auth.js           # verifyToken y requireAdmin
├── routes/
│   ├── authRoutes.js      # POST /login
│   ├── userRoutes.js      # Alta y consulta de usuarios/saldo
│   └── transferRoutes.js  # Transferencias entre cuentas
├── postman/
│   └── Banking_API.postman_collection.json
├── public/                # Frontend (HTML/CSS/JS plano)
│   ├── index.html
│   ├── styles.css
│   └── app.js
└── package.json
```

---

## 7. Notas

- Las contraseñas se guardan con hash (`bcryptjs`), nunca en texto plano.
- El archivo `bank.db` está en `.gitignore`: cada quien genera el suyo localmente al
  correr `npm start` por primera vez.
- Este proyecto es exclusivamente para práctica de testing; el manejo de JWT y
  saldos es intencionalmente simple y no debe usarse como base para un sistema
  bancario real.
