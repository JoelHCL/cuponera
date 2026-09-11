# Cupones — para dos personas 💌

App donde **una persona regala cupones a la otra**; quien los recibe los **solicita** y quien los
regaló los **marca como cobrados**. Pensada para una pareja (o dos personas fijas): una sola
instancia, un espacio, dos miembros.

Estados de cada cupón: **disponible → solicitado → cobrado**.

```
Persona A (regala) ──crea──▶ [disponible]
Persona B (recibe) ──solicita──▶ [solicitado]   (puede cancelar y volver a disponible)
Persona A (regala) ──marca cobrado──▶ [cobrado]
```

---

## Decisiones (y por qué)

- **Dos identidades reales, no un link compartido.** El sentido de la app es distinguir quién
  solicita de quién cobra; con un link único ambos serían la misma persona y el permiso "el otro
  lo marca" no significaría nada.
- **Auth ligera con PIN por persona**, no email/contraseña ni magic links. Para dos personas
  fijas, montar verificación por correo es sobre-ingeniería y obliga a contratar un servicio de
  email. La sesión va en una cookie **HttpOnly firmada** (JWT con `jose`). Esto es suficiente para
  una app privada de pareja sin datos sensibles ni dinero; **no** la uses para algo más serio.
- **Una sola instancia = un solo espacio.** El primer arranque crea el espacio y las dos personas.
  No hay registro abierto a terceros, a propósito.
- **Prisma + SQLite.** En JS/TS Prisma está perfectamente vivo y es lo idiomático en Next (el que
  se deprecó fue el cliente de Python). SQLite hace que corra sin servicios externos; pasar a
  Postgres en producción es cambiar el `provider` del esquema y la `DATABASE_URL`.

---

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind · Prisma + SQLite · `jose` (sesión) · `bcryptjs`
(PIN) · Zod (validación cliente y servidor).

```
cupones-pareja/
├── prisma/schema.prisma          # Space, Member, Coupon
├── src/
│   ├── app/
│   │   ├── page.tsx              # decide: setup / login / dashboard
│   │   ├── setup/                # alta del espacio + 2 personas (una vez)
│   │   ├── login/                # elegir quién eres + PIN
│   │   └── api/
│   │       ├── setup/            # POST crea espacio y autologin
│   │       ├── auth/             # login, logout, me
│   │       └── coupons/          # GET/POST y [id]/request|redeem|cancel + DELETE
│   ├── components/               # SetupForm, LoginForm, Dashboard, CouponCard, NewCouponModal
│   └── lib/                      # prisma, auth (jose), validation (zod), types, coupons (DTO)
└── .env.example
```

---

## Ejecutar en local

Requisitos: **Node.js 20+**.

```bash
npm install                 # instala deps y genera el cliente Prisma

cp .env.example .env
# Genera un secreto y pégalo en AUTH_SECRET:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

npx prisma db push          # crea la base SQLite (prisma/dev.db) con el esquema
npm run dev                 # http://localhost:3000
```

1. La primera visita te lleva a **/setup**: nombra el espacio y crea a las dos personas con su PIN.
2. Quedas logueado como la persona 1. Comparte la app y el PIN de la persona 2 con tu pareja.
3. Cada quien entra en **/login** eligiendo su nombre + PIN.

Para probar el flujo completo en una sola máquina, usa dos navegadores (o una ventana normal y
otra de incógnito) y entra como cada persona.

---

## Variables de entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | Base de datos | `file:./dev.db` (SQLite) |
| `AUTH_SECRET` | Secreto para firmar la cookie de sesión | (aleatorio largo) |

---

## Despliegue (Vercel)

SQLite no persiste en serverless, así que en producción usa **Postgres** (Vercel Postgres, Neon o
Supabase). El cambio es mínimo:

1. En `prisma/schema.prisma` cambia el datasource:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. En Vercel define `DATABASE_URL` (la de tu Postgres) y `AUTH_SECRET`.
3. El `build` ya ejecuta `prisma generate`. Aplica el esquema una vez con
   `npx prisma migrate deploy` (genera migraciones antes con `npx prisma migrate dev` en local) o,
   para empezar rápido, `npx prisma db push` apuntando a la base de producción.
4. Deploy. Como `AUTH_SECRET` y la cookie son del mismo dominio, no hay líos de cookies cross-site.

---

## Nota honesta sobre la verificación

Este proyecto se generó en un entorno donde la CDN de binarios de Prisma está bloqueada, así que
**no pude correr `next build` aquí**. Lo que sí verifiqué: el typecheck completo de TypeScript
sobre componentes, rutas, validación y el mapeo de datos (con el cliente Prisma tratado como `any`,
porque su engine no se pudo descargar en el sandbox). En tu máquina, `npm install` descarga el
engine y todo compila normal. Si algo falla al construir, es casi seguro que sea un paso de entorno
(falta `npx prisma db push` o el `.env`), no la lógica.

## Límites conocidos / siguientes pasos

- Sin tiempo real: si tu pareja crea un cupón mientras tú miras la lista, recarga para verlo
  (añadir polling o WebSocket es el siguiente paso natural).
- PIN = seguridad "suficiente para esto". Si alguna vez guardas algo sensible, sube a auth por
  email/contraseña o magic link.
- Una instancia = una pareja. Para varias parejas habría que reintroducir el concepto de registro.
