/**
 * @fileoverview Script para crear datos de prueba en la base de datos
 * @description Crea convenios de prueba para verificar filtros
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function crearDatosPrueba() {
  try {
    console.log('🚀 Iniciando creación de datos de prueba...\n');

    // Primero verificamos conexión
    console.log('🔌 Verificando conexión a la base de datos...');
    await prisma.$connect();
    console.log('✅ Conexión establecida\n');

    // Limpiar datos existentes (opcional)
    console.log('🧹 Limpiando datos existentes...');
    const deleted = await prisma.convenio.deleteMany();
    console.log(`🗑️ ${deleted.count} registros eliminados\n`);

    // Crear datos de prueba específicos para filtros
    console.log('📝 Creando convenios de prueba...');
    
    const conveniosPrueba = [
      {
        nombre: 'Convenio Académico Internacional 2025',
        descripcion: 'Intercambio estudiantil con universidades europeas',
        fechaInicio: new Date('2025-01-15'),
        fechaFin: new Date('2025-12-15'),
        estado: 'Activo'
      },
      {
        nombre: 'Convenio Tecnológico Microsoft',
        descripcion: 'Capacitación en tecnologías cloud para estudiantes',
        fechaInicio: new Date('2025-03-01'),
        fechaFin: new Date('2025-11-30'),
        estado: 'Activo'
      },
      {
        nombre: 'Convenio Investigación Borrador',
        descripcion: 'Proyecto de investigación en biotecnología pendiente',
        fechaInicio: new Date('2025-06-01'),
        fechaFin: new Date('2026-05-31'),
        estado: 'Borrador'
      },
      {
        nombre: 'Convenio Cultural Universidad Central',
        descripcion: 'Intercambio cultural y deportivo universitario',
        fechaInicio: new Date('2025-08-01'),
        fechaFin: new Date('2025-12-31'),
        estado: 'Borrador'
      },
      {
        nombre: 'Convenio Comercial 2024 Finalizado',
        descripcion: 'Proyecto comercial ya completado del año pasado',
        fechaInicio: new Date('2024-01-01'),
        fechaFin: new Date('2024-12-31'),
        estado: 'Finalizado'
      },
      {
        nombre: 'Convenio Prácticas Profesionales SENA',
        descripcion: 'Programa de prácticas para estudiantes técnicos',
        fechaInicio: new Date('2025-02-01'),
        fechaFin: new Date('2025-12-01'),
        estado: 'Activo'
      },
      {
        nombre: 'Convenio Histórico Archivado',
        descripcion: 'Convenio archivado de años anteriores',
        fechaInicio: new Date('2023-01-01'),
        fechaFin: new Date('2023-12-31'),
        estado: 'Archivado'
      }
    ];

    const result = await prisma.convenio.createMany({
      data: conveniosPrueba
    });

    console.log(`✅ ${result.count} convenios creados exitosamente!\n`);

    // Verificar datos creados
    console.log('📊 RESUMEN DE DATOS CREADOS:');
    const stats = await prisma.convenio.groupBy({
      by: ['estado'],
      _count: {
        id: true
      }
    });

    stats.forEach(stat => {
      console.log(`   ${stat.estado}: ${stat._count.id} convenios`);
    });

    console.log('\n🎯 URLs PARA PROBAR FILTROS:');
    console.log('🔗 http://localhost:3000/api/convenios?estado=Activo&debug=true');
    console.log('🔗 http://localhost:3000/api/convenios?estados=Activo,Borrador&debug=true');
    console.log('🔗 http://localhost:3000/api/convenios?fechaInicio=2025-01-01&debug=true');
    console.log('🔗 http://localhost:3000/api/convenios?busqueda=Universidad&debug=true');
    console.log('🔗 http://localhost:3000/api/convenios?estado=Activo&fechaInicio=2025-01-01&busqueda=Convenio&debug=true');

    console.log('\n🚀 DATOS LISTOS! Ahora puedes probar los filtros en tu navegador o Postman');

  } catch (error) {
    console.error('❌ Error al crear datos de prueba:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function verificarDatos() {
  try {
    console.log('🔍 Verificando datos en la base de datos...\n');
    
    const total = await prisma.convenio.count();
    console.log(`📊 Total de convenios: ${total}`);

    if (total === 0) {
      console.log('⚠️ No hay datos. Ejecuta: node scripts/datos-bd-real.js --crear');
      return;
    }

    const convenios = await prisma.convenio.findMany({
      select: {
        id: true,
        nombre: true,
        estado: true,
        fechaInicio: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('\n📋 CONVENIOS EN LA BASE DE DATOS:');
    convenios.forEach((convenio, index) => {
      console.log(`${index + 1}. ${convenio.nombre}`);
      console.log(`   Estado: ${convenio.estado} | Fecha: ${convenio.fechaInicio.toLocaleDateString()}`);
    });

    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error al verificar datos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar según argumentos
const args = process.argv.slice(2);

if (args.includes('--crear') || args.includes('-c')) {
  crearDatosPrueba();
} else if (args.includes('--verificar') || args.includes('-v')) {
  verificarDatos();
} else {
  console.log('📖 SCRIPT DE DATOS DE PRUEBA PARA BASE DE DATOS REAL');
  console.log('');
  console.log('Uso:');
  console.log('  node scripts/datos-bd-real.js --crear     # Crear datos de prueba');
  console.log('  node scripts/datos-bd-real.js --verificar # Ver datos existentes');
  console.log('');
  console.log('Ejemplos:');
  console.log('  node scripts/datos-bd-real.js -c');
  console.log('  node scripts/datos-bd-real.js -v');
}