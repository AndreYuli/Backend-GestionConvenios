# Backend de Gestión de Convenios

Backend para gestión de convenios institucionales desarrollado con Node.js, Express y Prisma ORM, con enfoque en seguridad, rendimiento y buenas prácticas de desarrollo.

## 🚀 Características

- **Arquitectura modular** siguiendo patrones de diseño (Repository, Strategy, Factory)
- **API RESTful** con endpoints documentados y validación de datos
- **Base de datos** PostgreSQL con Prisma ORM y consultas optimizadas
- **Autenticación segura** con JWT, bcrypt y protección contra ataques
- **Autorización basada en roles** (ADMIN, GESTOR, CONSULTOR)
- **Validación de datos** con Zod y manejo centralizado de errores
- **Sistema de testing** completo con Jest para pruebas unitarias e integración
- **Documentación** detallada con JSDoc y comentarios explicativos
- **Logging estructurado** para monitoreo y depuración

## 📋 Modelo de Datos

### Principales Entidades

#### Convenio
- `id`: Identificador único (autoincremental)
- `nombre`: Nombre del convenio (requerido)
- `descripcion`: Descripción del convenio (requerido)
- `fechaInicio`: Fecha de inicio del convenio
- `fechaFin`: Fecha de finalización del convenio
- `estado`: Estado del convenio (Borrador, Activo, Finalizado, Archivado)
- Relaciones: Partes, Documentos, Actividades

#### Parte
- `id`: Identificador único
- `nombre`: Nombre de la institución o entidad
- `contacto`: Información de contacto
- `tipo`: Tipo de entidad

#### User
- `id`: Identificador único
- `email`: Email único del usuario
- `password`: Contraseña hasheada con bcrypt
- `rol`: Rol del usuario (ADMIN, GESTOR, CONSULTOR)
- `isActive`: Estado de activación

#### Otros modelos
- `Document`: Documentos adjuntos a convenios
- `Actividad`: Actividades relacionadas con convenios
- `Producto`: Productos resultantes de actividades

## 🛠️ Instalación

### Requisitos previos
- Node.js (v16 o superior)
- PostgreSQL (v12 o superior)
- npm o yarn

### Pasos de instalación

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd Backend-GestionConvenios

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de base de datos y configuración

# 4. Generar cliente de Prisma
npm run build

# 5. Crear la base de datos (si no existe)
# Asegúrate de tener PostgreSQL instalado y configurado

# 6. Ejecutar migraciones
npm run db:migrate

# 7. (Opcional) Poblar la base de datos con datos de prueba
node scripts/poblar-base-datos.js
```

## 🚀 Uso

### Desarrollo
```bash
# Iniciar servidor en modo desarrollo con recarga automática
npm run dev
```

### Producción
```bash
# Iniciar servidor en modo producción
npm start
```

### Base de Datos
```bash
# Ejecutar migraciones
npm run db:migrate

# Abrir Prisma Studio (interfaz visual para la base de datos)
npm run db:studio
```

### Endpoints principales

#### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrar nuevo usuario (requiere permisos)

#### Convenios
- `GET /api/convenios` - Listar convenios (con filtros)
- `POST /api/convenios` - Crear convenio
- `GET /api/convenios/:id` - Obtener convenio por ID
- `PUT /api/convenios/:id` - Actualizar convenio
- `DELETE /api/convenios/:id` - Eliminar convenio

#### Documentos
- `POST /api/documents/upload/:convenioId` - Subir documento
- `GET /api/documents/:id` - Descargar documento

#### Dashboard y Reportes
- `GET /api/dashboard/stats` - Estadísticas generales
- `GET /api/reports/convenios` - Generar reportes

## 🧪 Testing

El proyecto incluye un sistema completo de testing con Jest para pruebas unitarias e integración:

### Ejecutar Tests
```bash
# Ejecutar todos los tests
npm test

# Todos los tests que funcionan
npm run test:all

# Tests específicos
npm run test:model      # Tests del modelo Convenio
npm run test:database   # Tests de integración de BD
npm run test:simple     # Tests básicos
npm run test:filtros    # Tests de filtros de consulta
npm run test:token      # Tests del sistema de tokens
npm run test:auth       # Tests de autenticación

# Modos especiales
npm run test:watch      # Modo watch (desarrollo)
npm run test:coverage   # Con cobertura de código
npm run test:verbose    # Modo verbose (detallado)
npm run test:integration # Tests de integración
```

### Cobertura de Tests
- ✅ **Modelos**: CRUD completo, validaciones, relaciones
- ✅ **Controladores**: Endpoints, manejo de errores, validaciones
- ✅ **Servicios**: Lógica de negocio, autenticación, autorización
- ✅ **Base de Datos**: Conexión, transacciones, consultas complejas
- ✅ **Filtros**: Búsqueda avanzada, ordenamiento, paginación

### Estructura de Tests
```
tests/
├── convenio.model.working.test.js    # Tests del modelo
├── database.working.test.js          # Tests de base de datos
├── filtros.integration.test.js       # Tests de filtros
├── filtros.bd.real.test.js           # Tests con BD real
├── filtros.simple.test.js            # Tests simples de filtros
├── consulta.logic.test.js            # Tests de lógica de consulta
├── setup.js                          # Configuración general
├── setup-integration.js              # Config para integración
└── README.md                         # Documentación de tests
```



## 🔧 Configuración

### Variables de Entorno

Crea un archivo `.env` basado en `.env.example` con las siguientes variables:

```env
# Database Configuration
DATABASE_URL="postgresql://usuario:password@localhost:5432/gestion_de_convenios"

# Server Configuration
PORT=3000
NODE_ENV=development

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
CORS_CREDENTIALS=true
CORS_MAX_AGE=86400

# JWT Secret (generar uno seguro para producción)
JWT_SECRET=tu-jwt-secret-muy-seguro-aqui

# Rate limiting
LOGIN_RATE_LIMIT_WINDOW_MS=900000
LOGIN_RATE_LIMIT_MAX_REQUESTS=5
```

### Base de Datos
- **Tipo**: PostgreSQL
- **ORM**: Prisma
- **Migraciones**: Automáticas con `npm run db:migrate`
- **Explorador**: Prisma Studio con `npm run db:studio`

## 🏗️ Arquitectura

### Estructura de Directorios
```
src/
├── controllers/     # Controladores de rutas
├── middleware/      # Middleware (auth, validación, etc)
├── routes/          # Definición de rutas
├── services/        # Lógica de negocio
├── validators/      # Esquemas de validación
└── lib/             # Utilidades y configuraciones
```

### Patrones de Diseño Implementados
- **Repository Pattern**: Separación de lógica de acceso a datos
- **Strategy Pattern**: Diferentes estrategias para autenticación y filtrado
- **Factory Pattern**: Creación de tokens y objetos complejos
- **Decorator Pattern**: Middleware componible
- **Builder Pattern**: Construcción dinámica de queries

## 🔒 Seguridad

- **Autenticación**: JWT con rotación de tokens
- **Contraseñas**: Hasheadas con bcrypt (12+ rondas)
- **Protección**: Rate limiting, validación de entrada, CORS configurado
- **Headers**: Security headers para prevenir XSS, CSRF, etc.
- **Autorización**: Basada en roles con middleware específico

## 📊 Estado del Proyecto

- ✅ **Backend básico** implementado
- ✅ **Modelo de datos** configurado
- ✅ **Sistema de testing** completo
- ✅ **Documentación** actualizada
- ✅ **Validaciones básicas** implementadas
- ✅ **Seguridad** implementada
- ✅ **Optimización de consultas** implementada
- 🔄 **Mejoras continuas** en proceso
