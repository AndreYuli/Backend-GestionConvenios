/**
 * @fileoverview Test de Integración para Verificar Filtros con Base de Datos Real
 * @description Tests que verifican que los filtros funcionen correctamente
 */

const request = require('supertest');
const express = require('express');
const { PrismaClient } = require('@prisma/client');

// Para este test, vamos a probar directamente con el servidor corriendo
// en lugar de importar las rutas (para evitar problemas de ES modules)

const prisma = new PrismaClient();

describe('🔍 Tests de Integración - Verificación de Filtros con BD Real', () => {
  
  beforeAll(async () => {
    // Preparar datos de prueba antes de los tests
    console.log('📋 Preparando datos de prueba en la base de datos...');
    
    // Limpiar datos existentes (solo para testing)
    await prisma.convenio.deleteMany();
    
    // Crear datos de prueba específicos para tests
    await prisma.convenio.createMany({
      data: [
        {
          nombre: 'Convenio Activo Test 2025',
          descripcion: 'Convenio para testing de filtros',
          fechaInicio: new Date('2025-01-15'),
          fechaFin: new Date('2025-12-15'),
          estado: 'Activo'
        },
        {
          nombre: 'Convenio Borrador Universidad',
          descripcion: 'Convenio universitario en borrador',
          fechaInicio: new Date('2025-03-01'),
          fechaFin: new Date('2025-11-30'),
          estado: 'Borrador'
        },
        {
          nombre: 'Convenio Finalizado 2024',
          descripcion: 'Convenio ya finalizado del año pasado',
          fechaInicio: new Date('2024-01-01'),
          fechaFin: new Date('2024-12-31'),
          estado: 'Finalizado'
        },
        {
          nombre: 'Convenio Académico Activo',
          descripcion: 'Convenio académico universitario activo',
          fechaInicio: new Date('2025-02-01'),
          fechaFin: new Date('2025-12-01'),
          estado: 'Activo'
        },
        {
          nombre: 'Convenio Archivado Histórico',
          descripcion: 'Convenio archivado de años anteriores',
          fechaInicio: new Date('2023-01-01'),
          fechaFin: new Date('2023-12-31'),
          estado: 'Archivado'
        }
      ]
    });
    
    console.log('✅ Datos de prueba creados exitosamente');
  });

  afterAll(async () => {
    // Limpiar después de los tests
    await prisma.convenio.deleteMany();
    await prisma.$disconnect();
    console.log('🧹 Datos de prueba limpiados');
  });

  describe('🎯 Filtro por Estado', () => {
    test('✅ Debe filtrar convenios por estado Activo', async () => {
      const response = await request(app)
        .get('/api/convenios')
        .query({ estado: 'Activo', debug: 'true' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBe(2); // Tenemos 2 convenios activos
      
      // Verificar que todos son estado Activo
      response.body.data.forEach(convenio => {
        expect(convenio.estado).toBe('Activo');
      });

      console.log('✅ Filtro por estado Activo: PASÓ');
    });

    test('✅ Debe filtrar convenios por estado Borrador', async () => {
      const response = await request(app)
        .get('/api/convenios')
        .query({ estado: 'Borrador', debug: 'true' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1); // Solo 1 borrador
      expect(response.body.data[0].estado).toBe('Borrador');

      console.log('✅ Filtro por estado Borrador: PASÓ');
    });

    test('✅ Debe filtrar por múltiples estados', async () => {
      const response = await request(app)
        .get('/api/convenios')
        .query({ estados: 'Activo,Borrador', debug: 'true' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(3); // 2 activos + 1 borrador
      
      // Verificar que todos son Activo o Borrador
      response.body.data.forEach(convenio => {
        expect(['Activo', 'Borrador']).toContain(convenio.estado);
      });

      console.log('✅ Filtro por múltiples estados: PASÓ');
    });
  });

  describe('📅 Filtro por Fechas', () => {
    test('✅ Debe filtrar convenios por fecha de inicio', async () => {
      const response = await request(app)
        .get('/api/convenios')
        .query({ fechaInicio: '2025-01-01', debug: 'true' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Verificar que todas las fechas son >= 2025-01-01
      response.body.data.forEach(convenio => {
        const fechaInicio = new Date(convenio.fechaInicio);
        expect(fechaInicio >= new Date('2025-01-01')).toBe(true);
      });

      console.log('✅ Filtro por fecha inicio: PASÓ');
    });

    test('✅ Debe filtrar convenios por rango de fechas', async () => {
      const response = await request(app)
        .get('/api/convenios')
        .query({ 
          fechaInicio: '2025-01-01', 
          fechaFin: '2025-12-31',
          debug: 'true' 
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verificar que todas están en el rango 2025
      response.body.data.forEach(convenio => {
        const fechaInicio = new Date(convenio.fechaInicio);
        expect(fechaInicio >= new Date('2025-01-01')).toBe(true);
        expect(fechaInicio <= new Date('2025-12-31')).toBe(true);
      });

      console.log('✅ Filtro por rango de fechas: PASÓ');
    });
  });

  describe('🔍 Filtro por Búsqueda de Texto', () => {
    test('✅ Debe buscar convenios por nombre', async () => {
      const response = await request(app)
        .get('/api/convenios')
        .query({ busqueda: 'Universidad', debug: 'true' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Verificar que contienen "Universidad" en nombre o descripción
      response.body.data.forEach(convenio => {
        const contieneEnNombre = convenio.nombre.toLowerCase().includes('universidad');
        const contieneEnDescripcion = convenio.descripcion.toLowerCase().includes('universidad');
        expect(contieneEnNombre || contieneEnDescripcion).toBe(true);
      });

      console.log('✅ Filtro de búsqueda de texto: PASÓ');
    });

    test('✅ Debe buscar convenios por descripción', async () => {
      const response = await request(app)
        .get('/api/convenios')
        .query({ busqueda: 'testing', debug: 'true' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      console.log('✅ Filtro de búsqueda en descripción: PASÓ');
    });
  });

  describe('🔄 Filtros Combinados', () => {
    test('✅ Debe aplicar múltiples filtros simultáneamente', async () => {
      const response = await request(app)
        .get('/api/convenios')
        .query({ 
          estado: 'Activo',
          fechaInicio: '2025-01-01',
          busqueda: 'Convenio',
          debug: 'true'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verificar que cumple TODOS los criterios
      response.body.data.forEach(convenio => {
        expect(convenio.estado).toBe('Activo');
        
        const fechaInicio = new Date(convenio.fechaInicio);
        expect(fechaInicio >= new Date('2025-01-01')).toBe(true);
        
        const contieneConvenio = convenio.nombre.toLowerCase().includes('convenio') ||
                                convenio.descripcion.toLowerCase().includes('convenio');
        expect(contieneConvenio).toBe(true);
      });

      console.log('✅ Filtros combinados: PASÓ');
    });
  });

  describe('📄 Paginación y Ordenamiento', () => {
    test('✅ Debe paginar correctamente', async () => {
      const response = await request(app)
        .get('/api/convenios')
        .query({ 
          page: 1,
          limit: 2,
          debug: 'true'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.metadata.page).toBe(1);
      expect(response.body.metadata.limit).toBe(2);

      console.log('✅ Paginación: PASÓ');
    });

    test('✅ Debe ordenar correctamente', async () => {
      const response = await request(app)
        .get('/api/convenios')
        .query({ 
          sortBy: 'nombre',
          sortOrder: 'asc',
          debug: 'true'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verificar que está ordenado alfabéticamente
      if (response.body.data.length > 1) {
        for (let i = 1; i < response.body.data.length; i++) {
          expect(response.body.data[i].nombre >= response.body.data[i-1].nombre).toBe(true);
        }
      }

      console.log('✅ Ordenamiento: PASÓ');
    });
  });

  describe('⚡ Rendimiento', () => {
    test('✅ Debe responder rápidamente con filtros complejos', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/convenios')
        .query({ 
          estados: 'Activo,Borrador,Finalizado',
          busqueda: 'Convenio',
          fechaInicio: '2023-01-01',
          debug: 'true'
        })
        .expect(200);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(executionTime).toBeLessThan(1000); // Menos de 1 segundo
      
      console.log(`⚡ Tiempo de ejecución: ${executionTime}ms`);
      console.log('✅ Rendimiento: PASÓ');
    });
  });
});