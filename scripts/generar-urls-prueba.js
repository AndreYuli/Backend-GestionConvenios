/**
 * @fileoverview Verificador Rápido de Filtros - Modo Manual
 * @description Script que genera URLs para probar manualmente en el navegador
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function generarURLsPrueba() {
  try {
    console.log('🚀 GENERADOR DE URLs PARA PROBAR FILTROS\n');
    
    // Verificar conexión y datos
    console.log('🔌 Verificando datos en base de datos...');
    await prisma.$connect();
    
    const stats = await prisma.convenio.groupBy({
      by: ['estado'],
      _count: { id: true }
    });
    
    const total = await prisma.convenio.count();
    
    console.log(`📊 Total de convenios: ${total}`);
    stats.forEach(stat => {
      console.log(`   ${stat.estado}: ${stat._count.id} convenios`);
    });
    
    console.log('\n🎯 URLs PARA PROBAR EN TU NAVEGADOR:');
    console.log('(Copia y pega estas URLs en tu navegador mientras el servidor está corriendo)\n');
    
    const baseUrl = 'http://localhost:3000/api/convenios';
    
    const tests = [
      {
        name: '1. Filtro por Estado Activo',
        url: `${baseUrl}?estado=Activo&debug=true`,
        expected: `Debería mostrar ${stats.find(s => s.estado === 'Activo')?._count.id || 0} convenios activos`
      },
      {
        name: '2. Múltiples Estados (Activo + Borrador)',
        url: `${baseUrl}?estados=Activo,Borrador&debug=true`,
        expected: 'Debería mostrar convenios activos y borrador'
      },
      {
        name: '3. Filtro por Fechas (2025)',
        url: `${baseUrl}?fechaInicio=2025-01-01&debug=true`,
        expected: 'Debería mostrar convenios del 2025'
      },
      {
        name: '4. Búsqueda de Texto',
        url: `${baseUrl}?busqueda=Universidad&debug=true`,
        expected: 'Debería mostrar convenios que contengan "Universidad"'
      },
      {
        name: '5. Filtros Combinados',
        url: `${baseUrl}?estado=Activo&fechaInicio=2025-01-01&busqueda=Convenio&debug=true`,
        expected: 'Debería aplicar todos los filtros juntos'
      },
      {
        name: '6. Paginación',
        url: `${baseUrl}?page=1&limit=2&debug=true`,
        expected: 'Debería mostrar máximo 2 registros'
      },
      {
        name: '7. Todos los Registros',
        url: `${baseUrl}?debug=true`,
        expected: `Debería mostrar todos los ${total} convenios`
      }
    ];
    
    tests.forEach(test => {
      console.log(`🔗 ${test.name}:`);
      console.log(`   ${test.url}`);
      console.log(`   ${test.expected}\n`);
    });
    
    console.log('📋 INSTRUCCIONES:');
    console.log('1. Asegúrate de que el servidor esté corriendo: npm run dev');
    console.log('2. Copia cualquier URL y ábrela en tu navegador');
    console.log('3. Verifica que los filtros funcionen correctamente');
    console.log('4. Con debug=true verás los logs detallados en la consola del servidor\n');
    
    console.log('✅ URLs generadas exitosamente!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

generarURLsPrueba();