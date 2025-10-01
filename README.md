# Sistema de Fichadas de Empleados

Una aplicación web completa para registrar las entradas y salidas de empleados en una empresa, desarrollada con React + Vite en el frontend y Node.js + Express + SQLite en el backend.

## Características

### Pantalla Principal (Para Empleados)
- Lista de empleados en cards grandes y touch-friendly
- Detección automática de tipo de fichada (ingreso/salida)
- Confirmación con dialog antes de registrar
- Versículos bíblicos rotativos cada hora
- Fondo con gradiente animado
- Responsive para tablets y pantallas táctiles

### Panel Administrativo
- Gestión completa de empleados (CRUD)
- Visualización de fichadas recientes
- Generación de reportes diarios y semanales
- Interfaz limpia y profesional

### Backend
- API REST con Express.js
- Base de datos SQLite con better-sqlite3
- Envío automático de reportes por email
- Cron jobs para reportes diarios (20:00) y semanales (lunes 9:00)
- Validaciones y manejo de errores

## Tecnologías Utilizadas

### Frontend
- **React 19** - Framework de interfaz de usuario
- **Vite** - Bundler y herramientas de desarrollo
- **TailwindCSS 4** - Framework de estilos
- **Shadcn/ui** - Componentes de interfaz
- **React Router** - Navegación
- **Axios** - Cliente HTTP
- **Lucide React** - Iconos

### Backend
- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web
- **SQLite** - Base de datos
- **better-sqlite3** - Driver de SQLite
- **Nodemailer** - Envío de emails
- **node-cron** - Tareas programadas

## Instalación y Ejecución

### Prerrequisitos
- Node.js (versión 18 o superior)
- pnpm (recomendado) o npm

### Instalación

1. **Instalar dependencias del backend:**
   ```bash
   cd backend
   npm install
   ```

2. **Instalar dependencias del frontend:**
   ```bash
   cd frontend
   pnpm install
   ```

### Configuración

1. **Backend - Variables de entorno (opcional):**
   Crear archivo `.env` en la carpeta `backend`:
   ```env
   PORT=3001
   EMAIL_USER=tu-email@gmail.com
   EMAIL_PASS=tu-contraseña-de-app
   ```

### Ejecución

1. **Iniciar el backend:**
   ```bash
   cd backend
   npm start
   # o para desarrollo:
   npm run dev
   ```
   El servidor estará disponible en `http://localhost:3001`

2. **Iniciar el frontend:**
   ```bash
   cd frontend
   pnpm dev
   ```
   La aplicación estará disponible en `http://localhost:3000`

## Estructura del Proyecto

```
fichadas/
├── backend/
│   ├── package.json
│   ├── server.js         # Servidor principal
│   ├── db.js            # Configuración de base de datos
│   └── empleados.db     # Base de datos SQLite (se crea automáticamente)
└── frontend/
    ├── package.json
    ├── src/
    │   ├── components/ui/   # Componentes de Shadcn/ui
    │   ├── hooks/          # Custom hooks
    │   ├── lib/            # Utilidades
    │   ├── pages/          # Páginas principales
    │   ├── App.jsx         # Componente raíz
    │   └── main.jsx        # Punto de entrada
    ├── vite.config.js
    └── tailwind.config.js
```

## API Endpoints

### Empleados
- `GET /api/empleados` - Obtener todos los empleados
- `POST /api/empleados` - Crear nuevo empleado
- `PUT /api/empleados/:id` - Actualizar empleado
- `DELETE /api/empleados/:id` - Eliminar empleado (soft delete)

### Fichadas
- `GET /api/fichadas` - Obtener fichadas (con filtros opcionales)
- `POST /api/fichadas` - Registrar nueva fichada
- `GET /api/fichadas/estado/:empleado_id` - Verificar estado de fichada

### Reportes
- `GET /api/reportes/diario` - Reporte diario
- `GET /api/reportes/semanal` - Reporte semanal

## Base de Datos

### Tabla `empleados`
- `id` - Primary key
- `nombre` - Nombre del empleado
- `apellido` - Apellido del empleado
- `horario_normal` - Descripción del horario
- `activo` - Estado del empleado (1 = activo, 0 = inactivo)
- `fecha_creacion` - Timestamp de creación

### Tabla `fichadas`
- `id` - Primary key
- `empleado_id` - Foreign key a empleados
- `tipo` - 'ingreso' o 'salida'
- `fecha_hora` - Timestamp de la fichada
- `observaciones` - Notas adicionales

## Funcionalidades Adicionales

### Versículos Bíblicos
- Se obtienen de la API https://bible-api.deno.dev/
- Cambian automáticamente cada hora
- Versículos comunes y motivadores

### Emails Automáticos
- Reporte diario enviado todos los días a las 20:00
- Reporte semanal enviado los lunes a las 9:00
- Configurar credenciales en variables de entorno

### Validaciones
- No permite fichadas duplicadas el mismo día
- Validación de campos requeridos
- Manejo de errores con mensajes descriptivos

## Datos de Prueba

La aplicación incluye 3 empleados de prueba:
1. Juan Pérez - Lunes a Viernes 8:00-17:00
2. María González - Lunes a Viernes 9:00-18:00
3. Carlos López - Lunes a Sábado 7:00-15:00

## Rutas de la Aplicación

- `/` - Pantalla principal de fichado (para empleados)
- `/admin` - Panel administrativo

## Desarrollo

### Scripts Disponibles

**Backend:**
- `npm start` - Iniciar servidor en producción
- `npm run dev` - Iniciar servidor con nodemon

**Frontend:**
- `pnpm dev` - Servidor de desarrollo
- `pnpm build` - Compilar para producción
- `pnpm preview` - Previsualizar build de producción

### Personalización

1. **Colores del gradiente:** Modificar en `frontend/src/index.css`
2. **Versículos:** Actualizar lista en `frontend/src/hooks/useApi.js`
3. **Horarios de emails:** Modificar cron jobs en `backend/server.js`

## Notas de Seguridad

- El panel admin es accesible directamente (sin autenticación) por simplicidad
- Para producción, se recomienda agregar autenticación
- Las credenciales de email deben configurarse como variables de entorno

## Soporte

Para problemas o preguntas, verificar:
1. Que ambos servidores estén ejecutándose
2. Los puertos 3000 y 3001 estén disponibles
3. Las dependencias estén instaladas correctamente

---

¡La aplicación está lista para usar! 🚀