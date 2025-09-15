# Backend de Gestión de Convenios

Backend para gestión de convenios con Prisma y Express, incluyendo un sistema completo de testing.

## 🚀 Características

- **Modelo de datos** para convenios con estados
- **Base de datos** PostgreSQL con Prisma ORM
- **Sistema de testing** completo con Jest
- **Validaciones** de datos y reglas de negocio
- **Documentación** detallada de tests

## 📋 Modelo de Datos

### Convenio
- `id`: Identificador único (autoincremental)
- `nombre`: Nombre del convenio (requerido)
- `descripcion`: Descripción del convenio (requerido)
- `fecha_inicio`: Fecha de inicio del convenio
- `fecha_fin`: Fecha de finalización del convenio
- `estado`: Estado del convenio (Borrador, Activo, Archivado)

## 🛠️ Instalación

```bash
# Clonar el repositorio
git clone <url-del-repositorio>
cd Backend-GestionConvenios

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de base de datos

# Generar cliente de Prisma
npm run build

# Ejecutar migraciones
npm run db:migrate
```

## 🚀 Uso

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm start
```

### Base de Datos
```bash
# Ejecutar migraciones
npm run db:migrate

# Abrir Prisma Studio
npm run db:studio
```

## 🧪 Testing

El proyecto incluye un sistema completo de testing con Jest:

### Ejecutar Tests
```bash
# Todos los tests que funcionan
npm run test:all

# Tests específicos
npm run test:model      # Tests del modelo Convenio
npm run test:database   # Tests de integración de BD
npm run test:simple     # Tests básicos

# Modos especiales
npm run test:watch      # Modo watch
npm run test:coverage   # Con cobertura de código
npm run test:verbose    # Modo verbose
```

### Cobertura de Tests
- ✅ **Modelo Convenio**: CRUD completo, validaciones, estados
- ✅ **Base de Datos**: Conexión, transacciones, consultas complejas
- ✅ **Reglas de Negocio**: Validaciones, estados, lógica de fechas

### Estructura de Tests
```
tests/
├── convenio.model.working.test.js     # Tests del modelo
├── database.working.test.js            # Tests de base de datos
├── simple.test.js                     # Tests básicos
└── README.md                          # Documentación de tests
```



## 🔧 Configuración

### Variables de Entorno
```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/gestion_de_convenios"
PORT=3000
```

### Base de Datos
- **Tipo**: PostgreSQL
- **ORM**: Prisma
- **Migraciones**: Automáticas con `npm run db:migrate`

## 📊 Estado del Proyecto

- ✅ **Backend básico** implementado
- ✅ **Modelo de datos** configurado
- ✅ **Sistema de testing** completo
- ✅ **Documentación** actualizada
- ✅ **Validaciones básicas** implementadas
- 🔄 **Reglas de negocio avanzadas** pendientes
