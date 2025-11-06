# Streetlifting AI - Instrucciones de Instalación

## Requisitos Previos

- Node.js (v14 o superior)
- npm o yarn
- Navegador web moderno

## Instalación

### 1. Clonar o descargar el proyecto

```bash
cd streetlifting-ai
```

### 2. Instalar dependencias del servidor

```bash
# En la raíz del proyecto
npm install
```

### 3. Instalar dependencias del cliente

```bash
cd client
npm install
cd ..
```

### 4. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto con:

```
PORT=5000
JWT_SECRET=tu_clave_secreta_aqui_cambiar_en_produccion
NODE_ENV=development
```

## Ejecución

### Opción 1: Ejecutar servidor y cliente por separado

**Terminal 1 - Servidor:**
```bash
npm run server
```

**Terminal 2 - Cliente:**
```bash
cd client
npm start
```

### Opción 2: Ejecutar ambos simultáneamente

```bash
npm run dev
```

## Acceso a la Aplicación

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Primer Uso

1. Abre http://localhost:3000 en tu navegador
2. Haz clic en "Regístrate" para crear una cuenta nueva
3. Elige si eres Atleta o Entrenador
4. Una vez registrado, serás redirigido al Dashboard

## Características Implementadas

### MVP Actual:
- ✅ Sistema de autenticación (registro/login)
- ✅ Gestión de usuarios (atletas y entrenadores)
- ✅ Base de datos SQLite con esquema completo
- ✅ API REST para todas las operaciones
- ✅ Calculadora de 1RM para dominadas, fondos y muscle-ups
- ✅ Dashboard con navegación
- ✅ Estructura para gestión de entrenamientos con PRS/sRPE

### Próximas Características:
- 🔄 Registro completo de entrenamientos
- 🔄 Análisis de video con MediaPipe
- 🔄 Visualización de progreso
- 🔄 Planes de entrenamiento adaptativos

## Solución de Problemas

### Error: "npm no se reconoce como comando"
- Instala Node.js desde https://nodejs.org/

### Error: "Puerto 5000 ya está en uso"
- Cambia el puerto en el archivo `.env`

### La base de datos no se crea
- El servidor creará automáticamente la base de datos SQLite en `server/database/streetlifting.db` al iniciar

## Estructura del Proyecto

```
streetlifting-ai/
├── server/              # Backend Node.js/Express
│   ├── routes/          # Rutas API
│   ├── middleware/      # Middleware de autenticación
│   └── database/        # Base de datos SQLite
├── client/              # Frontend React
│   ├── src/
│   │   ├── components/  # Componentes React
│   │   ├── pages/       # Páginas de la aplicación
│   │   └── contexts/    # Context API para estado global
│   └── public/          # Archivos estáticos
└── package.json         # Configuración del proyecto
``` 