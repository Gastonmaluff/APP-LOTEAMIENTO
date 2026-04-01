# APP-LOTEAMIENTO

App web para administrar y publicar el loteamiento Viva Lago con React, Vite, TypeScript, Tailwind CSS y Firebase.

## Stack actual

- React + Vite + TypeScript + Tailwind CSS
- Firebase Authentication para proteger el admin
- Firestore para persistencia de lotes
- SVG real del loteamiento con ids por poligono

## Variables de entorno

Crear `.env.local` a partir de `.env.example`.

```bash
cp .env.example .env.local
```

Variables principales:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_ADMIN_ALLOWED_EMAILS`
- `VITE_PROJECT_SLUG`

## Desarrollo local

```bash
npm install
npm run dev -- --host
```

Rutas:

- `/proyecto/viva-lago`
- `/admin/login`
- `/admin/dashboard`
- `/admin/lotes`
- `/admin/lotes/:id`

## Seed inicial de Firestore

1. Crear un usuario en Firebase Authentication con email y password.
2. Ingresar en `/admin/login`.
3. Abrir `/admin/dashboard`.
4. Hacer click en `Sembrar Firestore`.

El seed crea:

- `projects/viva-lago`
- `projects/viva-lago/lots/*`
- registros iniciales en `projects/viva-lago/adminActivity`

## Produccion

La app sigue publicandose en GitHub Pages con GitHub Actions al pushear a `main`.

Para que Firebase funcione en deploy:

1. Configurar las variables `VITE_FIREBASE_*` en el entorno de build.
2. Si desplegas con GitHub Pages, cargar esas variables en `Settings > Secrets and variables > Actions > Variables`.
3. Mantener habilitado Firebase Authentication.
4. Publicar `firestore.rules` desde Firebase CLI cuando quieras endurecer reglas en el proyecto real.
