/**
 * @fileoverview Test de Integración para Verificar Filtros con Base de Datos Real
 * @description Tests que verifican que los filtros funcionen correctamente
 */

const request = require('supertest');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// URL base para las pruebas (servidor debe estar corriendo)
const BASE_URL = 'http://localhost:3000';

describe('🔍 Tests de Integración - Verificación de Filtros con BD Real', () => {
  
  beforeAll(async () => {
    console.log('📋 Verificando datos de prueba existentes...');
    
    // Verificar que tenemos datos para testing
    const count = await prisma.convenio.count();
    if (count === 0) {
      console.log('⚠️ No hay datos de prueba. Ejecuta: node scripts/datos-bd-real.js --crear');
      throw new Error('No hay datos de prueba en la base de datos');
    }
    
    console.log(`✅ ${count} convenios disponibles para testing`);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    console.log('🔌 Conexión a BD cerrada');
  });

  describe('📊 Filtros Individuales', () => {
    
    test('debe filtrar por estado Activo correctamente', async () => {
      const response = await request(BASE_URL)
        .get('/api/convenios')
        .query({ estado: 'Activo', debug: 'true' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2); // 2 convenios activos
      expect(response.body.data.every(c => c.estado === 'Activo')).toBe(true);
      
      // Verificar que se aplicó el filtro
      expect(response.body.metadata.total).toBe(2);
      
      console.log('✅ Filtro por estado Activo: PASÓ');
    });

    test('debe filtrar por estado Borrador correctamente', async () => {
      const response = await request(BASE_URL)
        .get('/api/convenios')
        .query({ estado: 'Borrador', debug: 'true' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1); // 1 convenio borrador
      expect(response.body.data[0].estado).toBe('Borrador');
      
      console.log('✅ Filtro por estado Borrador: PASÓ');
    });

    test('debe filtrar por múltiples estados correctamente', async () => {
      const response = await request(BASE_URL)
        .get('/api/convenios')
        .query({ estados: 'Activo,Borrador', debug: 'true' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3); // 2 activos + 1 borrador
      
      const estados = response.body.data.map(c => c.estado);
      expect(estados.every(e => ['Activo', 'Borrador'].includes(e))).toBe(true);
      
      console.log('✅ Filtro por múltiples estados: PASÓ');
    });

    test('debe filtrar por rango de fechas correctamente', async () => {
      const response = await request(BASE_URL)
        .get('/api/convenios')
        .query({ 
          fechaInicio: '2025-01-01', 
          fechaFin: '2025-12-31',
          debug: 'true' 
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3); // 3 convenios del 2025
      
      response.body.data.forEach(convenio => {
        const fecha = new Date(convenio.fechaInicio);
        expect(fecha.getFullYear()).toBe(2025);
      });
      
      console.log('✅ Filtro por rango de fechas: PASÓ');
    });

    test('debe filtrar por búsqueda de texto correctamente', async () => {
      const response = await request(BASE_URL)
        .get('/api/convenios')
        .query({ busqueda: 'Universidad', debug: 'true' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Verificar que todos los resultados contienen "Universidad"
      response.body.data.forEach(convenio => {
        const contieneTexto = 
          convenio.nombre.toLowerCase().includes('universidad') ||
          convenio.descripcion.toLowerCase().includes('universidad');
        expect(contieneTexto).toBe(true);
      });
      
      console.log('✅ Filtro por búsqueda de texto: PASÓ');
    });
  });

  describe('🎯 Filtros Combinados', () => {
    
    test('debe aplicar múltiples filtros simultáneamente', async () => {
      const response = await request(BASE_URL)
        .get('/api/convenios')
        .query({ 
          estado: 'Activo',
          fechaInicio: '2025-01-01',
          fechaFin: '2025-12-31',
          debug: 'true'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2); // 2 convenios activos del 2025
      
      response.body.data.forEach(convenio => {
        expect(convenio.estado).toBe('Activo');
        expect(new Date(convenio.fechaInicio).getFullYear()).toBe(2025);
      });
      
      console.log('✅ Filtros combinados (estado + fechas): PASÓ');
    });

    test('debe combinar búsqueda de texto con filtros', async () => {
      const response = await request(BASE_URL)
        .get('/api/convenios')
        .query({ 
          busqueda: 'Convenio',
          estado: 'Activo',
          debug: 'true'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      response.body.data.forEach(convenio => {
        expect(convenio.estado).toBe('Activo');
        const contieneTexto = 
          convenio.nombre.toLowerCase().includes('convenio') ||
          convenio.descripcion.toLowerCase().includes('convenio');
        expect(contieneTexto).toBe(true);
      });
      
      console.log('✅ Filtros combinados (búsqueda + estado): PASÓ');
    });
  });

  describe('📄 Paginación y Ordenamiento', () => {
    
    test('debe paginar correctamente', async () => {
      const response = await request(BASE_URL)
        .get('/api/convenios')
        .query({ page: 1, limit: 2, debug: 'true' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.metadata.page).toBe(1);
      expect(response.body.metadata.limit).toBe(2);
      expect(response.body.metadata.total).toBe(5); // Total de registros
      
      console.log('✅ Paginación: PASÓ');
    });

    test('debe ordenar correctamente', async () => {
      const response = await request(BASE_URL)
        .get('/api/convenios')
        .query({ 
          sortBy: 'nombre', 
          sortOrder: 'asc',
          debug: 'true'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verificar que está ordenado alfabéticamente
      const nombres = response.body.data.map(c => c.nombre);
      const nombresOrdenados = [...nombres].sort();
      expect(nombres).toEqual(nombresOrdenados);
      
      console.log('✅ Ordenamiento: PASÓ');
    });
  });

  describe('🔍 Búsqueda Avanzada', () => {
    
    test('debe realizar búsqueda avanzada correctamente', async () => {
      const criterios = {
        textSearch: 'Activo',
        estados: ['Activo', 'Borrador'],
        fechaDesde: '2025-01-01',
        fechaHasta: '2025-12-31',
        ordenarPor: 'fechaInicio',
        orden: 'asc',
        pagina: 1,
        limite: 10
      };

      const response = await request(BASE_URL)
        .post('/api/convenios/search')
        .send(criterios)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      console.log('✅ Búsqueda avanzada: PASÓ');
    });
  });

  describe('📊 Estadísticas', () => {
    
    test('debe obtener estadísticas correctamente', async () => {
      const response = await request(BASE_URL)
        .get('/api/convenios/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('porEstado');
      expect(response.body.data.total).toBe(5);
      
      // Verificar conteo por estado
      expect(response.body.data.porEstado.Activo).toBe(2);
      expect(response.body.data.porEstado.Borrador).toBe(1);
      expect(response.body.data.porEstado.Finalizado).toBe(1);
      expect(response.body.data.porEstado.Archivado).toBe(1);
      
      console.log('✅ Estadísticas: PASÓ');
    });
  });

  describe('🚫 Casos Límite', () => {
    
    test('debe manejar filtros que no retornan resultados', async () => {
      const response = await request(BASE_URL)
        .get('/api/convenios')
        .query({ estado: 'EstadoInexistente', debug: 'true' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
      expect(response.body.metadata.total).toBe(0);
      
      console.log('✅ Filtros sin resultados: PASÓ');
    });

    test('debe manejar parámetros vacíos', async () => {
      const response = await request(BASE_URL)
        .get('/api/convenios')
        .query({ estado: '', busqueda: '', debug: 'true' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(5); // Todos los registros
      
      console.log('✅ Parámetros vacíos: PASÓ');
    });

    test('debe validar parámetros inválidos', async () => {
      const response = await request(BASE_URL)
        .get('/api/convenios')
        .query({ page: -1, limit: 1000 })
        .expect(400); // Error de validación

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      
      console.log('✅ Validación de parámetros inválidos: PASÓ');
    });
  });
});

// Test de rendimiento básico
describe('⚡ Tests de Rendimiento', () => {
  
  test('debe ejecutar filtros en tiempo razonable', async () => {
    const startTime = Date.now();
    
    const response = await request(BASE_URL)
      .get('/api/convenios')
      .query({ 
        estados: 'Activo,Borrador,Finalizado',
        busqueda: 'Convenio',
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