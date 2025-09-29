/**
 * @fileoverview Test Simple y Directo para Verificar Filtros
 * @description Script que prueba los filtros directamente sin Jest
 */

import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000/api/convenios';

// Colores para la consola
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testEndpoint(name, url, expectedCount = null) {
  try {
    log(colors.blue, `\n🔍 ${name}`);
    log(colors.yellow, `URL: ${url}`);
    
    const response = await axios.get(url);
    
    if (response.data.success) {
      const count = response.data.data.length;
      const total = response.data.metadata?.total || count;
      
      log(colors.green, `✅ Exitoso: ${count} registros encontrados (total: ${total})`);
      
      if (expectedCount !== null) {
        if (count === expectedCount) {
          log(colors.green, `✅ Coincide con lo esperado: ${expectedCount}`);
        } else {
          log(colors.yellow, `⚠️ Esperaba ${expectedCount}, obtuvo ${count}`);
        }
      }
      
      // Mostrar algunos datos de muestra
      if (response.data.data.length > 0) {
        const sample = response.data.data[0];
        log(colors.blue, `📄 Muestra: ${sample.nombre} (${sample.estado})`);
      }
      
      return { success: true, count, data: response.data };
    } else {
      log(colors.red, `❌ Error en respuesta: ${response.data.message}`);
      return { success: false, error: response.data.message };
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      log(colors.red, `❌ Servidor no disponible. ¿Está corriendo 'npm run dev'?`);
    } else {
      log(colors.red, `❌ Error: ${error.message}`);
    }
    return { success: false, error: error.message };
  }
}

async function verificarDatosDisponibles() {
  try {
    log(colors.bold, '🔌 Verificando conexión a base de datos...');
    await prisma.$connect();
    
    const stats = await prisma.convenio.groupBy({
      by: ['estado'],
      _count: { id: true }
    });
    
    const total = await prisma.convenio.count();
    
    if (total === 0) {
      log(colors.red, '❌ No hay datos de prueba en la base de datos');
      log(colors.yellow, 'Ejecuta: node scripts/datos-bd-real.js --crear');
      return false;
    }
    
    log(colors.green, `✅ ${total} convenios disponibles:`);
    stats.forEach(stat => {
      log(colors.blue, `   ${stat.estado}: ${stat._count.id} convenios`);
    });
    
    return { total, stats };
  } catch (error) {
    log(colors.red, `❌ Error de base de datos: ${error.message}`);
    return false;
  }
}

async function ejecutarTests() {
  log(colors.bold, '🚀 INICIANDO TESTS DE FILTROS CON BASE DE DATOS REAL\n');
  
  // Verificar datos disponibles
  const datos = await verificarDatosDisponibles();
  if (!datos) {
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(60));
  log(colors.bold, '📋 EJECUTANDO TESTS DE FILTROS');  
  console.log('='.repeat(60));
  
  const tests = [
    {
      name: 'Filtro por Estado Activo',
      url: `${BASE_URL}?estado=Activo&debug=true`,
      expected: datos.stats.find(s => s.estado === 'Activo')?._count.id || 0
    },
    {
      name: 'Múltiples Estados (Activo + Borrador)',
      url: `${BASE_URL}?estados=Activo,Borrador&debug=true`,
      expected: null
    },
    {
      name: 'Filtro por Fechas (2025)',
      url: `${BASE_URL}?fechaInicio=2025-01-01&debug=true`,
      expected: null
    },
    {
      name: 'Búsqueda de Texto (Universidad)',
      url: `${BASE_URL}?busqueda=Universidad&debug=true`,
      expected: null
    },
    {
      name: 'Filtros Combinados',
      url: `${BASE_URL}?estado=Activo&fechaInicio=2025-01-01&busqueda=Convenio&debug=true`,
      expected: null
    },
    {
      name: 'Paginación (2 por página)',
      url: `${BASE_URL}?page=1&limit=2&debug=true`,
      expected: 2
    },
    {
      name: 'Todos los Registros',
      url: `${BASE_URL}?debug=true`,
      expected: datos.total
    }
  ];
  
  let pasados = 0;
  let fallidos = 0;
  
  for (const test of tests) {
    const resultado = await testEndpoint(test.name, test.url, test.expected);
    if (resultado.success) {
      pasados++;
    } else {
      fallidos++;
    }
    await new Promise(resolve => setTimeout(resolve, 500)); // Pausa breve
  }
  
  console.log('\n' + '='.repeat(60));
  log(colors.bold, '📊 RESUMEN DE RESULTADOS');
  console.log('='.repeat(60));
  
  if (fallidos === 0) {
    log(colors.green, `🎉 TODOS LOS TESTS PASARON: ${pasados}/${tests.length}`);
    log(colors.green, '✅ Los filtros están funcionando correctamente!');
  } else {
    log(colors.yellow, `⚠️ Resultados: ${pasados} pasaron, ${fallidos} fallaron`);
    
    if (fallidos === tests.length) {
      log(colors.red, '❌ Ningún test pudo ejecutarse. Verifica que el servidor esté corriendo.');
      log(colors.yellow, 'Ejecuta en otra terminal: npm run dev');
    }
  }
  
  await prisma.$disconnect();
}

// Ejecutar tests
ejecutarTests().catch(error => {
  log(colors.red, `❌ Error fatal: ${error.message}`);
  process.exit(1);
});