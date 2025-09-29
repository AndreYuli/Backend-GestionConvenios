/**
 * @fileoverview Script para generar datos de prueba y verificar filtros
 * @description Genera datos de convenios para probar que los filtros funcionen correctamente
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Generar datos de prueba para verificar filtros
 */
async function generarDatosDePrueba() {
  try {
    console.log('🚀 Generando datos de prueba para verificar filtros...');

    // Limpiar datos existentes (opcional, comenta si no quieres)
    // await prisma.convenio.deleteMany();
    
    const conveniosPrueba = [
      // Convenios Activos 2025
      {
        nombre: 'Convenio Académico Universidad Nacional 2025',
        descripcion: 'Intercambio estudiantil con universidad nacional',
        fechaInicio: new Date('2025-01-15'),
        fechaFin: new Date('2025-12-15'),
        estado: 'Activo'
      },
      {
        nombre: 'Convenio Comercial Empresa Tech 2025',
        descripcion: 'Prácticas profesionales en tecnología',
        fechaInicio: new Date('2025-03-01'),
        fechaFin: new Date('2025-11-30'),
        estado: 'Activo'
      },
      
      // Convenios Borrador 2025
      {
        nombre: 'Convenio Investigación Científica',
        descripcion: 'Proyecto de investigación en biotecnología',
        fechaInicio: new Date('2025-06-01'),
        fechaFin: new Date('2026-05-31'),
        estado: 'Borrador'
      },
      {
        nombre: 'Convenio Cultural Internacional',
        descripcion: 'Intercambio cultural con universidades europeas',
        fechaInicio: new Date('2025-08-01'),
        fechaFin: new Date('2025-12-31'),
        estado: 'Borrador'
      },
      
      // Convenios Finalizados 2024
      {
        nombre: 'Convenio Médico Hospital Central',
        descripcion: 'Prácticas médicas en hospital universitario',
        fechaInicio: new Date('2024-01-01'),
        fechaFin: new Date('2024-12-31'),
        estado: 'Finalizado'
      },
      {
        nombre: 'Convenio Deportivo Liga Nacional',
        descripcion: 'Participación en liga universitaria',
        fechaInicio: new Date('2024-02-01'),
        fechaFin: new Date('2024-11-30'),
        estado: 'Finalizado'
      },
      
      // Convenios Archivados
      {
        nombre: 'Convenio Histórico Biblioteca Nacional',
        descripcion: 'Digitalización de archivos históricos',
        fechaInicio: new Date('2023-01-01'),
        fechaFin: new Date('2023-12-31'),
        estado: 'Archivado'
      },
      
      // Más convenios con palabras clave para búsqueda
      {
        nombre: 'Convenio Universidad Adventista Colombia',
        descripcion: 'Intercambio académico adventista',
        fechaInicio: new Date('2025-02-01'),
        fechaFin: new Date('2025-12-01'),
        estado: 'Activo'
      },
      {
        nombre: 'Acuerdo Comercial Industria Alimentaria',
        descripcion: 'Convenio para prácticas en industria de alimentos',
        fechaInicio: new Date('2025-04-01'),
        fechaFin: new Date('2025-10-31'),
        estado: 'Borrador'
      },
      {
        nombre: 'Convenio Tecnológico Inteligencia Artificial',
        descripcion: 'Desarrollo de IA para educación',
        fechaInicio: new Date('2025-05-01'),
        fechaFin: new Date('2026-04-30'),
        estado: 'Activo'
      }
    ];

    // Insertar datos
    const conveniosCreados = await prisma.convenio.createMany({
      data: conveniosPrueba,
      skipDuplicates: true
    });

    console.log(`✅ ${conveniosCreados.count} convenios de prueba creados`);

    // Mostrar resumen de datos creados
    const stats = await prisma.convenio.groupBy({
      by: ['estado'],
      _count: { estado: true }
    });

    console.log('📊 Resumen de datos de prueba:');
    stats.forEach(stat => {
      console.log(`   ${stat.estado}: ${stat._count.estado} convenios`);
    });

    console.log('\n🧪 CASOS DE PRUEBA PREPARADOS:');
    console.log('1. Filtrar por estado Activo: debe retornar 4 convenios');
    console.log('2. Filtrar por estado Borrador: debe retornar 3 convenios');
    console.log('3. Filtrar por fechas 2025: debe retornar 7 convenios');
    console.log('4. Buscar "Universidad": debe retornar 2 convenios');
    console.log('5. Buscar "Tecnolog": debe retornar 2 convenios');
    console.log('6. Filtrar estados [Activo,Borrador]: debe retornar 7 convenios');

  } catch (error) {
    console.error('❌ Error generando datos de prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Verificar que los filtros funcionen correctamente
 */
async function verificarFiltros() {
  try {
    console.log('\n🔍 VERIFICANDO FILTROS...\n');

    // Test 1: Filtrar por estado
    console.log('TEST 1: Filtrar por estado Activo');
    const activosQuery = { where: { estado: 'Activo' } };
    const activos = await prisma.convenio.findMany(activosQuery);
    console.log(`   Resultado: ${activos.length} convenios activos`);
    console.log(`   Nombres: ${activos.map(c => c.nombre.substring(0, 30)).join(', ')}`);

    // Test 2: Filtrar por múltiples estados
    console.log('\nTEST 2: Filtrar por estados [Activo, Borrador]');
    const multiEstadosQuery = { where: { estado: { in: ['Activo', 'Borrador'] } } };
    const multiEstados = await prisma.convenio.findMany(multiEstadosQuery);
    console.log(`   Resultado: ${multiEstados.length} convenios activos o borrador`);

    // Test 3: Filtrar por rango de fechas
    console.log('\nTEST 3: Filtrar por fechas del 2025');
    const fechas2025Query = {
      where: {
        fechaInicio: {
          gte: new Date('2025-01-01'),
          lte: new Date('2025-12-31')
        }
      }
    };
    const fechas2025 = await prisma.convenio.findMany(fechas2025Query);
    console.log(`   Resultado: ${fechas2025.length} convenios del 2025`);

    // Test 4: Búsqueda de texto
    console.log('\nTEST 4: Buscar texto "Universidad"');
    const busquedaQuery = {
      where: {
        OR: [
          { nombre: { contains: 'Universidad', mode: 'insensitive' } },
          { descripcion: { contains: 'Universidad', mode: 'insensitive' } }
        ]
      }
    };
    const busqueda = await prisma.convenio.findMany(busquedaQuery);
    console.log(`   Resultado: ${busqueda.length} convenios con "Universidad"`);
    console.log(`   Nombres: ${busqueda.map(c => c.nombre.substring(0, 40)).join(', ')}`);

    // Test 5: Filtros combinados
    console.log('\nTEST 5: Filtros combinados - Activos del 2025 con "Convenio"');
    const combinadosQuery = {
      where: {
        AND: [
          { estado: 'Activo' },
          {
            fechaInicio: {
              gte: new Date('2025-01-01'),
              lte: new Date('2025-12-31')
            }
          },
          {
            OR: [
              { nombre: { contains: 'Convenio', mode: 'insensitive' } },
              { descripcion: { contains: 'Convenio', mode: 'insensitive' } }
            ]
          }
        ]
      }
    };
    const combinados = await prisma.convenio.findMany(combinadosQuery);
    console.log(`   Resultado: ${combinados.length} convenios que cumplan todos los criterios`);

    // Test 6: Paginación
    console.log('\nTEST 6: Paginación - Página 1, límite 3');
    const paginacionQuery = {
      take: 3,
      skip: 0,
      orderBy: { createdAt: 'desc' }
    };
    const paginacion = await prisma.convenio.findMany(paginacionQuery);
    console.log(`   Resultado: ${paginacion.length} convenios (página 1)`);

    console.log('\n✅ Verificación de filtros completada');

  } catch (error) {
    console.error('❌ Error verificando filtros:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--generar') || args.includes('-g')) {
    await generarDatosDePrueba();
  }
  
  if (args.includes('--verificar') || args.includes('-v')) {
    await verificarFiltros();
  }
  
  if (args.length === 0) {
    console.log('🔧 Uso del script:');
    console.log('  node datos-prueba.js --generar    # Generar datos de prueba');
    console.log('  node datos-prueba.js --verificar  # Verificar filtros');
    console.log('  node datos-prueba.js -g -v       # Ambos');
  }
}

main().catch(console.error);