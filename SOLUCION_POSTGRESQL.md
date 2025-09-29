# 🚀 **Soluciones para Iniciar PostgreSQL**

## 🎯 **Opción 1: Permisos de Administrador (Recomendado)**

### **Método A: PowerShell como Administrador**
1. **Cerrar PowerShell actual**
2. **Buscar "PowerShell" en el menú inicio**
3. **Click derecho → "Ejecutar como administrador"**
4. **Navegar al proyecto:**
   ```powershell
   cd "C:\Users\lopez\OneDrive - Corporación Universitaria Adventista\Documentos\Proyectos de la universidad\Backend-GestionConvenios"
   ```
5. **Iniciar PostgreSQL:**
   ```powershell
   Start-Service postgresql-x64-17
   ```
6. **Verificar que esté corriendo:**
   ```powershell
   Get-Service postgresql-x64-17
   ```

### **Método B: Servicios de Windows**
1. **Presionar Win + R**
2. **Escribir: `services.msc`**
3. **Buscar: "postgresql-x64-17"**
4. **Click derecho → "Iniciar"**

## 🎯 **Opción 2: Crear Base de Datos (Si no existe)**

Una vez que PostgreSQL esté corriendo, crear la base de datos:

```powershell
# Conectar a PostgreSQL (cambia 'postgres' por tu usuario)
psql -U postgres -h localhost

# Crear la base de datos
CREATE DATABASE gestion_de_convenios;

# Crear usuario (opcional, si no tienes)
CREATE USER usuario WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE gestion_de_convenios TO usuario;

# Salir
\q
```

## 🎯 **Opción 3: Usar pgAdmin (GUI)**

Si tienes pgAdmin instalado:
1. **Abrir pgAdmin**
2. **Conectar al servidor local**
3. **Crear base de datos: "gestion_de_convenios"**

## 🎯 **Opción 4: Docker (Alternativa)**

Si prefieres usar Docker:
```powershell
docker run --name postgres-convenios `
  -e POSTGRES_DB=gestion_de_convenios `
  -e POSTGRES_USER=usuario `
  -e POSTGRES_PASSWORD=password `
  -p 5432:5432 `
  -d postgres:13
```

## 🎯 **Una Vez que PostgreSQL esté Corriendo:**

### **1. Verificar conexión:**
```powershell
pg_isready -h localhost -p 5432
# Debe mostrar: localhost:5432 - accepting connections
```

### **2. Ejecutar migraciones:**
```powershell
npm run db:migrate
```

### **3. Generar datos de prueba:**
```powershell
node scripts/datos-prueba.js --generar
```

### **4. Probar filtros:**
```powershell
npm run dev
# En otra terminal o Postman:
# GET http://localhost:3000/api/convenios?estado=Activo&debug=true
```

## 🎯 **Verificar tu Configuración Actual:**

Tu `.env` debe tener:
```
DATABASE_URL="postgresql://usuario:password@localhost:5432/gestion_de_convenios"
PORT=3000
```

**Cambia `usuario` y `password` por tus credenciales reales de PostgreSQL.**

## 🚨 **Si Sigues Teniendo Problemas:**

### **Opción Simple - Usar SQLite temporalmente:**
```properties
# En .env cambiar por:
DATABASE_URL="file:./dev.db"
```

```prisma
// En prisma/schema.prisma cambiar:
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

---

## 🎯 **Próximos Pasos Recomendados:**

1. **Ejecutar PowerShell como administrador**
2. **Iniciar PostgreSQL: `Start-Service postgresql-x64-17`**
3. **Verificar conexión: `pg_isready -h localhost -p 5432`**
4. **Ejecutar migraciones: `npm run db:migrate`**
5. **Generar datos: `node scripts/datos-prueba.js --generar`**
6. **Probar filtros: `npm run dev`**

**¡Una vez que PostgreSQL esté corriendo, tus filtros funcionarán perfectamente con datos reales!** 🚀