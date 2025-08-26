# Backend - Gestión de Convenios

Backend desarrollado con Node.js, Express y Prisma para la gestión de convenios universitarios.

## 🚀 Características

- Base de datos PostgreSQL con Prisma ORM
- Estructura modular y escalable
- Validación de datos
- Manejo de errores

## 📋 Prerrequisitos

- Node.js (versión 18 o superior)
- PostgreSQL
- npm o yarn

## 🛠️ Instalación

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd Backend-GestionConvenios
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto con la siguiente configuración:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# Server Configuration
PORT=3000
```

**Nota:** Reemplaza `username`, `password`, `localhost`, `5432` y `database_name` con tus credenciales de PostgreSQL.

### 4. Configurar la base de datos

#### Opción A: Crear base de datos manualmente
```sql
CREATE DATABASE database_name;
```

#### Opción B: Usar Prisma Migrate (recomendado)
```bash
# Generar el cliente de Prisma
npm run build

# Ejecutar migraciones
npm run db:migrate
```

### 5. Generar el cliente de Prisma

```bash
npm run build
```

## 🚀 Ejecutar el proyecto

### Modo desarrollo (con auto-reload)
```bash
npm run dev
```

### Modo producción
```bash
npm start
```

El servidor estará disponible en `http://localhost:3000`

## 📚 Scripts disponibles

- `npm start` - Ejecuta la aplicación en modo producción
- `npm run dev` - Ejecuta la aplicación en modo desarrollo con auto-reload
- `npm run build` - Genera el cliente de Prisma
- `npm run db:migrate` - Ejecuta las migraciones de la base de datos
- `npm run db:studio` - Abre Prisma Studio para gestionar la base de datos

## 🗄️ Estructura de la base de datos

### Modelo Convenio
- `id` - Identificador único (autoincremental)
- `nombre` - Nombre del convenio
- `descripcion` - Descripción detallada
- `fecha_inicio` - Fecha de inicio del convenio
- `fecha_fin` - Fecha de finalización del convenio
- `estado` - Estado del convenio (Borrador, Activo, Archivado)



## 🛠️ Desarrollo

### Agregar nuevas dependencias
```bash
npm install nombre-del-paquete
```

### Agregar dependencias de desarrollo
```bash
npm install --save-dev nombre-del-paquete
```

### Actualizar el esquema de Prisma
Después de modificar `prisma/schema.prisma`:
```bash
npm run db:migrate
npm run build
```

## 📝 Notas importantes

- **NUNCA** subas el archivo `.env` al repositorio
- El directorio `generated/` se genera automáticamente y no debe subirse
- Las migraciones de Prisma se almacenan en `prisma/migrations/`
- Asegúrate de tener PostgreSQL ejecutándose antes de iniciar la aplicación

## 🆘 Soporte

Si tienes problemas o preguntas:
1. Revisa la documentación de [Prisma](https://www.prisma.io/docs/)
2. Verifica que PostgreSQL esté ejecutándose
3. Revisa los logs del servidor
4. Abre un issue en el repositorio