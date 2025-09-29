/**
 * @fileoverview Script para poblar la base de datos con datos de prueba
 * @description Crea usuarios, convenios y actividades de prueba para testing
 * @author Sistema de Gestión de Convenios
 * @version 1.0.0
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando población de base de datos con datos de prueba...');

  try {
    // 1. Crear usuarios de prueba
    console.log('👥 Creando usuarios de prueba...');
    
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const users = await Promise.all([
      prisma.user.upsert({
        where: { email: 'admin@unac.edu.co' },
        update: {},
        create: {
          email: 'admin@unac.edu.co',
          password: hashedPassword,
          rol: 'ADMIN',
          isActive: true
        }
      }),
      prisma.user.upsert({
        where: { email: 'gestor1@unac.edu.co' },
        update: {},
        create: {
          email: 'gestor1@unac.edu.co',
          password: hashedPassword,
          rol: 'GESTOR',
          isActive: true
        }
      }),
      prisma.user.upsert({
        where: { email: 'gestor2@unac.edu.co' },
        update: {},
        create: {
          email: 'gestor2@unac.edu.co',
          password: hashedPassword,
          rol: 'GESTOR',
          isActive: true
        }
      }),
      prisma.user.upsert({
        where: { email: 'consultor@unac.edu.co' },
        update: {},
        create: {
          email: 'consultor@unac.edu.co',
          password: hashedPassword,
          rol: 'CONSULTOR',
          isActive: true
        }
      })
    ]);

    console.log(`✅ Creados ${users.length} usuarios`);

    // 2. Crear partes para convenios
    console.log('🏢 Creando partes...');
    
    const partes = await Promise.all([
      prisma.parte.upsert({
        where: { nombre: 'Universidad Nacional de Colombia' },
        update: {},
        create: {
          nombre: 'Universidad Nacional de Colombia',
          contacto: 'contacto@unal.edu.co',
          tipo: 'Universidad'
        }
      }),
      prisma.parte.upsert({
        where: { nombre: 'Ministerio de Educación' },
        update: {},
        create: {
          nombre: 'Ministerio de Educación',
          contacto: 'convenios@mineducacion.gov.co',
          tipo: 'Entidad Gubernamental'
        }
      }),
      prisma.parte.upsert({
        where: { nombre: 'Corporación Tecnológica InnovaTech' },
        update: {},
        create: {
          nombre: 'Corporación Tecnológica InnovaTech',
          contacto: 'alianzas@innovatech.com',
          tipo: 'Empresa Privada'
        }
      })
    ]);

    console.log(`✅ Creadas ${partes.length} partes`);

    // 3. Crear convenios de prueba
    console.log('📄 Creando convenios de prueba...');
    
    const convenios = await Promise.all([
      prisma.convenio.create({
        data: {
          nombre: 'Convenio de Investigación en Inteligencia Artificial',
          descripcion: 'Convenio marco para el desarrollo conjunto de proyectos de investigación en el área de inteligencia artificial y machine learning.',
          fechaInicio: new Date('2024-01-15'),
          fechaFin: new Date('2025-12-31'),
          estado: 'Activo'
        }
      }),
      prisma.convenio.create({
        data: {
          nombre: 'Convenio de Prácticas Profesionales',
          descripcion: 'Acuerdo para la realización de prácticas profesionales de estudiantes en empresas del sector tecnológico.',
          fechaInicio: new Date('2024-03-01'),
          fechaFin: new Date('2024-11-30'),
          estado: 'Activo'
        }
      }),
      prisma.convenio.create({
        data: {
          nombre: 'Convenio de Capacitación Docente',
          descripcion: 'Programa de capacitación y actualización para docentes en nuevas tecnologías educativas.',
          fechaInicio: new Date('2024-02-01'),
          fechaFin: new Date('2024-08-31'),
          estado: 'Borrador'
        }
      })
    ]);

    console.log(`✅ Creados ${convenios.length} convenios`);

    // 4. Relacionar convenios con partes
    console.log('🔗 Creando relaciones convenio-parte...');
    
    await Promise.all([
      // Convenio 1 con Universidad Nacional y Ministerio
      prisma.convenioParte.create({
        data: {
          convenioId: convenios[0].id,
          parteId: partes[0].id
        }
      }),
      prisma.convenioParte.create({
        data: {
          convenioId: convenios[0].id,
          parteId: partes[1].id
        }
      }),
      // Convenio 2 con InnovaTech
      prisma.convenioParte.create({
        data: {
          convenioId: convenios[1].id,
          parteId: partes[2].id
        }
      }),
      // Convenio 3 con Ministerio
      prisma.convenioParte.create({
        data: {
          convenioId: convenios[2].id,
          parteId: partes[1].id
        }
      })
    ]);

    console.log('✅ Relaciones convenio-parte creadas');

    // 5. Crear actividades de prueba
    console.log('📋 Creando actividades de prueba...');
    
    const actividades = await Promise.all([
      // Actividades para Convenio 1 (IA)
      prisma.actividad.create({
        data: {
          convenioId: convenios[0].id,
          nombre: 'Análisis de Requerimientos del Proyecto',
          descripcion: 'Realizar el análisis detallado de los requerimientos técnicos y funcionales para el proyecto de IA.',
          responsableId: users[1].id, // gestor1
          fechaInicio: new Date('2024-01-20'),
          fechaFin: new Date('2024-02-15'),
          estado: 'Completada'
        }
      }),
      prisma.actividad.create({
        data: {
          convenioId: convenios[0].id,
          nombre: 'Desarrollo del Modelo de Machine Learning',
          descripcion: 'Implementar y entrenar los modelos de machine learning según las especificaciones definidas.',
          responsableId: users[2].id, // gestor2
          fechaInicio: new Date('2024-02-16'),
          fechaFin: new Date('2024-06-30'),
          estado: 'EnProgreso'
        }
      }),
      prisma.actividad.create({
        data: {
          convenioId: convenios[0].id,
          nombre: 'Documentación Técnica',
          descripcion: 'Crear la documentación técnica completa del proyecto incluyendo manuales de usuario y desarrollador.',
          responsableId: users[1].id, // gestor1
          fechaInicio: new Date('2024-07-01'),
          fechaFin: new Date('2024-08-31'),
          estado: 'Planeada'
        }
      }),
      // Actividades para Convenio 2 (Prácticas)
      prisma.actividad.create({
        data: {
          convenioId: convenios[1].id,
          nombre: 'Selección de Estudiantes',
          descripcion: 'Proceso de selección y evaluación de estudiantes candidatos para las prácticas profesionales.',
          responsableId: users[2].id, // gestor2
          fechaInicio: new Date('2024-03-05'),
          fechaFin: new Date('2024-03-25'),
          estado: 'Completada'
        }
      }),
      prisma.actividad.create({
        data: {
          convenioId: convenios[1].id,
          nombre: 'Asignación de Proyectos',
          descripcion: 'Asignar proyectos específicos a cada estudiante según su perfil y área de interés.',
          responsableId: users[1].id, // gestor1
          fechaInicio: new Date('2024-03-26'),
          fechaFin: new Date('2024-04-10'),
          estado: 'EnProgreso'
        }
      }),
      prisma.actividad.create({
        data: {
          convenioId: convenios[1].id,
          nombre: 'Seguimiento y Evaluación',
          descripcion: 'Realizar el seguimiento continuo y evaluación del desempeño de los estudiantes.',
          responsableId: users[2].id, // gestor2
          fechaInicio: new Date('2024-04-11'),
          fechaFin: new Date('2024-11-15'),
          estado: 'Planeada'
        }
      }),
      // Actividad para Convenio 3 (Capacitación)
      prisma.actividad.create({
        data: {
          convenioId: convenios[2].id,
          nombre: 'Diseño del Programa de Capacitación',
          descripcion: 'Diseñar el programa de capacitación incluyendo contenidos, metodología y cronograma.',
          responsableId: users[1].id, // gestor1
          fechaInicio: new Date('2024-02-05'),
          fechaFin: new Date('2024-02-28'),
          estado: 'Planeada'
        }
      })
    ]);

    console.log(`✅ Creadas ${actividades.length} actividades`);

    // 6. Mostrar resumen
    console.log('\n📊 RESUMEN DE DATOS CREADOS:');
    console.log(`👥 Usuarios: ${users.length}`);
    console.log(`🏢 Partes: ${partes.length}`);
    console.log(`📄 Convenios: ${convenios.length}`);
    console.log(`📋 Actividades: ${actividades.length}`);
    
    console.log('\n🔐 CREDENCIALES DE ACCESO:');
    console.log('Email: admin@unac.edu.co | Password: password123 | Rol: ADMIN');
    console.log('Email: gestor1@unac.edu.co | Password: password123 | Rol: GESTOR');
    console.log('Email: gestor2@unac.edu.co | Password: password123 | Rol: GESTOR');
    console.log('Email: consultor@unac.edu.co | Password: password123 | Rol: CONSULTOR');
    
    console.log('\n✅ ¡Base de datos poblada exitosamente!');

  } catch (error) {
    console.error('❌ Error al poblar la base de datos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });