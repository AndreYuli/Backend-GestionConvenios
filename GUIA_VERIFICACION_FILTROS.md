# 🔍 **Guía para Verificar que los Filtros Funcionen Correctamente**

## 🎯 **Herramientas Implementadas para Verificar Filtros**

### 1. **📋 Logging Detallado** 
- **Ubicación**: `src/controllers/convenios.controller.js`
- **Función**: Ver en tiempo real qué parámetros llegan y cómo se procesan

### 2. **🔧 Modo Debug**
- **Activación**: Agregar `?debug=true` a cualquier consulta
- **Función**: Muestra las queries Prisma generadas y el análisis de filtros

### 3. **🧪 Datos de Prueba**
- **Script**: `scripts/datos-prueba.js`
- **Función**: Genera datos específicos para probar filtros

### 4. **🧪 Tests de Integración**
- **Archivo**: `tests/filtros.integration.test.js`
- **Función**: Tests automatizados que verifican cada filtro

## 🚀 **Cómo Verificar que los Filtros Funcionen**

### **Paso 1: Generar Datos de Prueba**
```bash
# Generar datos de prueba
node scripts/datos-prueba.js --generar

# Verificar que los filtros funcionen con los datos
node scripts/datos-prueba.js --verificar

# Hacer ambos
node scripts/datos-prueba.js -g -v
```

### **Paso 2: Probar con Modo Debug**

#### **🔍 Ejemplo 1: Filtro por Estado**
```bash
# URL con debug activado
GET http://localhost:3000/api/convenios?estado=Activo&debug=true
```

**Lo que verás en la consola:**
```
📋 PARÁMETROS RECIBIDOS: {
  estado: 'Activo',
  debug: 'true',
  timestamp: '2025-09-28T...'
}

🎛️ FILTROS APLICADOS: {
  estado: 'Activo',
  estados: null,
  fechaInicio: undefined,
  fechaFin: undefined,
  busqueda: undefined  
}

🔧 QUERY GENERADA (Prisma): {
  "where": {
    "estado": "Activo"
  },
  "orderBy": {
    "createdAt": "desc"
  },
  "skip": 0,
  "take": 10
}

🎯 FILTROS ACTIVOS: {
  estado: '✅',
  estados: '❌', 
  fechaInicio: '❌',
  fechaFin: '❌',
  busqueda: '❌'
}

📊 RESULTADO DE FILTROS: {
  registrosEncontrados: 4,
  totalEnBD: 10,
  tiempoConsulta: '25ms',
  filtrosEfectivos: '✅ Filtros aplicados'
}
```

#### **🔍 Ejemplo 2: Filtros Combinados**
```bash
# URL con múltiples filtros
GET http://localhost:3000/api/convenios?estados=Activo,Borrador&fechaInicio=2025-01-01&busqueda=Universidad&debug=true
```

**Lo que verás:**
```
📋 PARÁMETROS RECIBIDOS: {
  estados: 'Activo,Borrador',
  fechaInicio: '2025-01-01', 
  busqueda: 'Universidad',
  debug: 'true'
}

🔄 ESTADOS PROCESADOS: ['Activo', 'Borrador']

🎛️ FILTROS APLICADOS: {
  estados: ['Activo', 'Borrador'],
  fechaInicio: '2025-01-01',
  busqueda: 'Universidad'
}

🔧 QUERY GENERADA (Prisma): {
  "where": {
    "estado": { "in": ["Activo", "Borrador"] },
    "fechaInicio": { "gte": "2025-01-01T00:00:00.000Z" },
    "OR": [
      { "nombre": { "contains": "Universidad", "mode": "insensitive" } },
      { "descripcion": { "contains": "Universidad", "mode": "insensitive" } }
    ]
  }
}

🎯 FILTROS ACTIVOS: {
  estados: '✅ (2)',
  fechaInicio: '✅',
  busqueda: '✅ ("Universidad")'
}

📊 RESULTADO DE FILTROS: {
  registrosEncontrados: 2,
  totalEnBD: 10,
  tiempoConsulta: '18ms',
  filtrosEfectivos: '✅ Filtros aplicados'
}
```

### **Paso 3: Usar Postman/Insomnia para Pruebas Manuales**

#### **📝 Tests Recomendados:**

**1. Filtro por Estado:**
```
GET http://localhost:3000/api/convenios?estado=Activo&debug=true
```
*Debería retornar solo convenios activos*

**2. Múltiples Estados:**
```
GET http://localhost:3000/api/convenios?estados=Activo,Borrador&debug=true  
```
*Debería retornar convenios activos Y borrador*

**3. Rango de Fechas:**
```
GET http://localhost:3000/api/convenios?fechaInicio=2025-01-01&fechaFin=2025-12-31&debug=true
```
*Debería retornar solo convenios del 2025*

**4. Búsqueda de Texto:**
```
GET http://localhost:3000/api/convenios?busqueda=Universidad&debug=true
```
*Debería retornar convenios que contengan "Universidad"*

**5. Filtros Combinados:**
```
GET http://localhost:3000/api/convenios?estado=Activo&fechaInicio=2025-01-01&busqueda=Convenio&debug=true
```
*Debería aplicar todos los filtros simultáneamente*

**6. Paginación:**
```
GET http://localhost:3000/api/convenios?page=2&limit=3&debug=true
```
*Debería retornar 3 registros de la página 2*

**7. Ordenamiento:**
```
GET http://localhost:3000/api/convenios?sortBy=nombre&sortOrder=asc&debug=true
```
*Debería ordenar por nombre alfabéticamente*

### **Paso 4: Ejecutar Tests Automatizados**

```bash
# Instalar dependencia de testing (si no está)
npm install --save-dev supertest

# Ejecutar tests de integración específicos
npm test tests/filtros.integration.test.js

# Ver tests con detalle
npm run test:verbose tests/filtros.integration.test.js
```

### **Paso 5: Verificar en la Respuesta JSON**

**✅ Indicadores de que los Filtros Funcionan:**

1. **Campo `metadata.total`** diferente al número de `data.length`:
```json
{
  "data": [2 convenios],
  "metadata": {
    "total": 2,     // ← Total después de filtros
    "totalRecords": 10  // ← Total en BD sin filtros
  }
}
```

2. **Campo `debug`** (cuando debug=true):
```json
{
  "debug": {
    "queryGenerated": {...},
    "filtersApplied": {...},
    "executionTime": 25
  }
}
```

3. **Todos los registros cumplen los criterios**:
```json
{
  "data": [
    {"estado": "Activo", "nombre": "..."},  // ← Todos tienen estado Activo
    {"estado": "Activo", "nombre": "..."}   // ← si filtraste por Activo
  ]
}
```

## 🔧 **Solución de Problemas Comunes**

### **Problem 1: Puerto 3000 ocupado**
```bash
# Opción 1: Cambiar puerto
$env:PORT=3001; node index.js

# Opción 2: Matar procesos Node.js
taskkill /f /im node.exe
```

### **Problem 2: Filtros no funcionan**
1. **Verificar logs en consola** con `debug=true`
2. **Revisar estructura de parámetros** en el log
3. **Verificar que hay datos de prueba** con el script

### **Problem 3: Sin datos de prueba**
```bash
# Generar datos específicos para tests
node scripts/datos-prueba.js --generar
```

## 📊 **Casos de Prueba Específicos**

### **Test Case 1: Filtro por Estado** ✅
- **URL**: `?estado=Activo`
- **Esperado**: Solo convenios con estado "Activo"
- **Verificar**: Todos los `response.data[].estado === "Activo"`

### **Test Case 2: Filtro por Fechas** ✅
- **URL**: `?fechaInicio=2025-01-01&fechaFin=2025-12-31`
- **Esperado**: Solo convenios del 2025
- **Verificar**: Todas las `fechaInicio` están en 2025

### **Test Case 3: Búsqueda de Texto** ✅
- **URL**: `?busqueda=Universidad`
- **Esperado**: Convenios que contengan "Universidad"
- **Verificar**: `nombre` o `descripcion` contiene "Universidad"

### **Test Case 4: Filtros Combinados** ✅
- **URL**: `?estado=Activo&fechaInicio=2025-01-01&busqueda=Convenio`
- **Esperado**: Cumple TODOS los criterios
- **Verificar**: Estado AND fecha AND texto

### **Test Case 5: Paginación** ✅
- **URL**: `?page=2&limit=3`
- **Esperado**: 3 registros, página 2
- **Verificar**: `data.length <= 3` y `metadata.page === 2`

## 🎉 **Confirmación de que Funciona**

**✅ Los filtros funcionan correctamente cuando:**
1. **Debug logs** muestran filtros aplicados
2. **Resultado** contiene solo registros que cumplen criterios
3. **Metadata.total** refleja registros filtrados
4. **Tests automatizados** pasan
5. **Tiempo de respuesta** es rápido (<100ms típicamente)

**❌ Los filtros NO funcionan si:**
1. **Siempre** retorna todos los registros
2. **No hay diferencia** entre consulta con/sin filtros  
3. **Debug logs** muestran filtros como "❌"
4. **Tests** fallan
5. **Queries** no incluyen cláusulas WHERE

---

## 🚀 **Comandos Rápidos para Verificar**

```bash
# 1. Generar datos y verificar
node scripts/datos-prueba.js -g -v

# 2. Iniciar servidor 
npm run dev

# 3. Test rápido con curl
curl "http://localhost:3000/api/convenios?estado=Activo&debug=true"

# 4. Tests automatizados
npm test tests/filtros.integration.test.js
```

Con estas herramientas tienes **visibilidad completa** de cómo funcionan tus filtros. El modo debug te permitirá ver exactamente qué está pasando en cada consulta! 🔍