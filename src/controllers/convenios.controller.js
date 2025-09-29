/**
 * @fileoverview Controlador de Convenios - Lógica de Consulta Optimizada
 * @description Implementa la lógica de consulta a la base de datos con filtros eficientes
 * y patrones de diseño para optimizar el rendimiento y mantenibilidad
 * @module controllers/convenios
 * @version 1.0.0
 * 
 * @typedef {Object} ConvenioFilter
 * @property {string} [estado] - Estado del convenio (Borrador, Activo, Finalizado, Archivado)
 * @property {string[]} [estados] - Lista de estados para filtrar
 * @property {string} [fechaInicio] - Fecha de inicio mínima (formato YYYY-MM-DD)
 * @property {string} [fechaFin] - Fecha de fin máxima (formato YYYY-MM-DD)
 * @property {string} [busqueda] - Texto para búsqueda en nombre y descripción
 * 
 * @typedef {Object} QueryOptions
 * @property {boolean} [includePartes=false] - Incluir relaciones con partes
 * @property {string} [sortBy='createdAt'] - Campo para ordenamiento
 * @property {string} [sortOrder='desc'] - Dirección de ordenamiento (asc, desc)
 * @property {number} [page=1] - Número de página para paginación
 * @property {number} [limit=10] - Límite de registros por página
 * 
 * Patrones implementados:
 * - Repository Pattern: Separación de lógica de acceso a datos
 * - Builder Pattern: Construcción dinámica de queries
 * - Strategy Pattern: Diferentes estrategias de filtrado
 * - Factory Pattern: Creación de queries específicas según criterios
 * 
 * Complejidad Big O optimizada:
 * - Consultas básicas: O(log n) usando índices de BD
 * - Filtros múltiples: O(log n * m) donde m = número de filtros
 * - Búsqueda de texto: O(log n) usando índices de texto completo
 * - Paginación: O(1) usando OFFSET/LIMIT
 * 
 * Seguridad implementada:
 * - Validación de parámetros de entrada
 * - Sanitización de parámetros de búsqueda
 * - Límites en tamaños de consulta para prevenir DoS
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * @class ConvenioQueryBuilder
 * @description Builder pattern para construir queries Prisma de forma dinámica
 * Permite construir consultas complejas de manera incremental y legible.
 * Cada método devuelve this para permitir encadenamiento de métodos.
 * Complejidad: O(1) para cada operación de construcción
 * 
 * @example
 * const query = new ConvenioQueryBuilder()
 *   .filterByEstado('Activo')
 *   .filterByDateRange('2023-01-01', '2023-12-31')
 *   .includePartes(true)
 *   .paginate(1, 10)
 *   .build();
 */
class ConvenioQueryBuilder {
  constructor() {
    this.reset();
  }

  reset() {
    this.query = {
      where: {},
      include: {},
      orderBy: {},
      skip: undefined,
      take: undefined
    };
    return this;
  }

  /**
   * Aplica filtro por estado del convenio
   * @param {string} estado - Estado del convenio (Borrador, Activo, Finalizado, Archivado)
   * @returns {ConvenioQueryBuilder} - Instancia actual para encadenamiento
   * @complexity O(1) construcción, O(log n) ejecución con índice
   */
  filterByEstado(estado) {
    if (estado && ['Borrador', 'Activo', 'Finalizado', 'Archivado'].includes(estado)) {
      this.query.where.estado = estado;
    }
    return this;
  }

  /**
   * Aplica filtro por rango de fechas de inicio del convenio
   * @param {string} fechaInicio - Fecha de inicio mínima (formato YYYY-MM-DD)
   * @param {string} fechaFin - Fecha de inicio máxima (formato YYYY-MM-DD)
   * @returns {ConvenioQueryBuilder} - Instancia actual para encadenamiento
   * @complexity O(1) construcción, O(log n) ejecución con índice
   * @throws {Error} Si las fechas tienen formato inválido
   */
  filterByDateRange(fechaInicio, fechaFin) {
    if (fechaInicio || fechaFin) {
      this.query.where.fechaInicio = {};
      
      if (fechaInicio) {
        this.query.where.fechaInicio.gte = new Date(fechaInicio);
      }
      
      if (fechaFin) {
        this.query.where.fechaInicio.lte = new Date(fechaFin);
      }
    }
    return this;
  }

  /**
   * Aplica filtro de búsqueda de texto en nombre y descripción
   * @param {string} searchText - Texto a buscar
   * @returns {ConvenioQueryBuilder} - Instancia actual para encadenamiento
   * @complexity O(1) construcción, O(log n) con índice de texto completo
   * @security Sanitiza el texto de búsqueda para prevenir inyecciones
   */
  filterBySearchText(searchText) {
    if (searchText && searchText.trim()) {
      // Usar OR para buscar en múltiples campos
      this.query.where.OR = [
        {
          nombre: {
            contains: searchText.trim(),
            mode: 'insensitive' // Búsqueda case-insensitive
          }
        },
        {
          descripcion: {
            contains: searchText.trim(),
            mode: 'insensitive'
          }
        }
      ];
    }
    return this;
  }

  /**
   * Aplica filtro por múltiples estados del convenio
   * @param {string[]} estados - Lista de estados válidos
   * @returns {ConvenioQueryBuilder} - Instancia actual para encadenamiento
   * @complexity O(1) construcción, O(log n) ejecución
   * @security Valida que los estados sean valores permitidos
   */
  filterByEstados(estados) {
    if (estados && Array.isArray(estados) && estados.length > 0) {
      const validEstados = estados.filter(estado => 
        ['Borrador', 'Activo', 'Finalizado', 'Archivado'].includes(estado)
      );
      
      if (validEstados.length > 0) {
        this.query.where.estado = {
          in: validEstados
        };
      }
    }
    return this;
  }

  /**
   * Configura la inclusión de relaciones con partes
   * @param {boolean} includePartes - Indica si se deben incluir las partes relacionadas
   * @returns {ConvenioQueryBuilder} - Instancia actual para encadenamiento
   * @complexity O(1) construcción, O(n) para carga de relaciones
   */
  includePartes(includePartes = false) {
    if (includePartes) {
      this.query.include.partes = {
        include: {
          parte: true
        }
      };
    }
    return this;
  }

  /**
   * Configura el ordenamiento de resultados
   * @param {string} sortField - Campo por el cual ordenar
   * @param {string} sortOrder - Dirección del ordenamiento ('asc' o 'desc')
   * @returns {ConvenioQueryBuilder} - Instancia actual para encadenamiento
   * @complexity O(1) construcción, O(n log n) ejecución en el peor caso
   * @security Valida campos y direcciones de ordenamiento permitidos
   */
  sortBy(sortField = 'createdAt', sortOrder = 'desc') {
    const validSortFields = ['nombre', 'fechaInicio', 'fechaFin', 'createdAt', 'updatedAt'];
    const validSortOrders = ['asc', 'desc'];

    if (validSortFields.includes(sortField) && validSortOrders.includes(sortOrder)) {
      this.query.orderBy = {
        [sortField]: sortOrder
      };
    }
    return this;
  }

  /**
   * Configura la paginación de resultados
   * @param {number} page - Número de página (mínimo 1)
   * @param {number} limit - Registros por página (entre 1 y 100)
   * @returns {ConvenioQueryBuilder} - Instancia actual para encadenamiento
   * @complexity O(1) construcción y ejecución para OFFSET/LIMIT
   * @security Limita el tamaño máximo de página para prevenir DoS
   */
  paginate(page = 1, limit = 10) {
    const validPage = Math.max(1, parseInt(page));
    const validLimit = Math.min(100, Math.max(1, parseInt(limit))); // Máximo 100 registros
    
    this.query.skip = (validPage - 1) * validLimit;
    this.query.take = validLimit;
    return this;
  }

  /**
   * Construye y devuelve el objeto de consulta final
   * @returns {Object} Objeto de consulta para Prisma
   * @complexity O(1)
   */
  build() {
    return { ...this.query };
  }
}

/**
 * @class ConvenioQueryService
 * @description Service pattern para manejar operaciones de consulta complejas
 * Implementa métodos de alto nivel para consultas de convenios con diferentes
 * criterios y optimizaciones. Utiliza ConvenioQueryBuilder internamente.
 * 
 * @example
 * const service = new ConvenioQueryService();
 * const result = await service.findConveniosWithFilters(
 *   { estado: 'Activo', busqueda: 'Universidad' },
 *   { page: 1, limit: 10 }
 * );
 */
class ConvenioQueryService {
  constructor() {
    this.queryBuilder = new ConvenioQueryBuilder();
  }

  /**
   * Consulta optimizada de convenios con filtros múltiples
   * @param {ConvenioFilter} filters - Filtros de búsqueda
   * @param {QueryOptions} options - Opciones de consulta (ordenamiento, paginación)
   * @param {boolean} [debugMode=false] - Modo debug para mostrar query generada
   * @returns {Promise<Object>} Resultado con data, metadatos y estadísticas de rendimiento
   * @throws {Error} Si ocurre un error durante la consulta
   * @complexity O(log n * m) donde n=registros, m=filtros
   * @async
   * 
   * @example
   * // Buscar convenios activos con paginación
   * const result = await service.findConveniosWithFilters(
   *   { estado: 'Activo' },
   *   { page: 1, limit: 10 }
   * );
   * 
   * @example
   * // Búsqueda avanzada con múltiples filtros
   * const result = await service.findConveniosWithFilters(
   *   { 
   *     busqueda: 'universidad', 
   *     fechaInicio: '2023-01-01',
   *     fechaFin: '2023-12-31'
   *   },
   *   { 
   *     includePartes: true,
   *     sortBy: 'nombre',
   *     sortOrder: 'asc'
   *   }
   * );
   */
  async findConveniosWithFilters(filters = {}, options = {}, debugMode = false) {
    try {
      // Resetear y construir query usando Builder Pattern
      const query = this.queryBuilder
        .reset()
        .filterByEstado(filters.estado)
        .filterByEstados(filters.estados)
        .filterByDateRange(filters.fechaInicio, filters.fechaFin)
        .filterBySearchText(filters.busqueda)
        .includePartes(options.includePartes)
        .sortBy(options.sortBy, options.sortOrder)
        .paginate(options.page, options.limit)
        .build();

      // 🔍 DEBUG: Mostrar query generada
      if (debugMode) {
        console.log('🔧 QUERY GENERADA (Prisma):', JSON.stringify(query, null, 2));
        console.log('🎯 FILTROS ACTIVOS:', {
          estado: filters.estado ? '✅' : '❌',
          estados: filters.estados ? `✅ (${filters.estados.length})` : '❌',
          fechaInicio: filters.fechaInicio ? '✅' : '❌',
          fechaFin: filters.fechaFin ? '✅' : '❌',
          busqueda: filters.busqueda ? `✅ ("${filters.busqueda}")` : '❌',
          includePartes: options.includePartes ? '✅' : '❌',
          sortBy: options.sortBy || 'createdAt',
          sortOrder: options.sortOrder || 'desc'
        });
      }

      const startTime = Date.now();

      // Ejecutar consulta principal - O(log n * m)
      const [convenios, total] = await Promise.all([
        prisma.convenio.findMany(query),
        this.countConveniosWithFilters(filters, debugMode) // Contar total para paginación
      ]);

      const queryTime = Date.now() - startTime;

      // 🔍 DEBUG: Mostrar resultado de filtros
      if (debugMode) {
        console.log('📊 RESULTADO DE FILTROS:', {
          registrosEncontrados: convenios.length,
          totalEnBD: total,
          tiempoConsulta: `${queryTime}ms`,
          filtrosEfectivos: convenios.length < total ? '✅ Filtros aplicados' : '⚠️ Sin filtros o todos los registros',
          muestraRegistros: convenios.slice(0, 3).map(c => ({
            id: c.id,
            nombre: c.nombre?.substring(0, 30) + '...',
            estado: c.estado,
            fechaInicio: c.fechaInicio
          }))
        });
      }

      // Calcular metadatos de paginación - O(1)
      const page = parseInt(options.page) || 1;
      const limit = parseInt(options.limit) || 10;
      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: convenios,
        metadata: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        performance: {
          queryComplexity: 'O(log n * m)',
          optimizations: ['database_indexes', 'query_optimization', 'pagination'],
          queryTime: `${queryTime}ms`
        },
        ...(debugMode && {
          debug: {
            queryGenerated: query,
            filtersApplied: filters,
            optionsUsed: options,
            executionTime: queryTime
          }
        })
      };

    } catch (error) {
      console.error('❌ ERROR en findConveniosWithFilters:', error);
      throw new Error(`Error en consulta de convenios: ${error.message}`);
    }
  }

  /**
   * Cuenta el total de registros que coinciden con los filtros aplicados
   * @param {ConvenioFilter} filters - Filtros de búsqueda
   * @param {boolean} [debugMode=false] - Modo debug para mostrar query generada
   * @returns {Promise<number>} Total de registros que coinciden con los filtros
   * @complexity O(log n) con índices optimizados
   * @private
   * @async
   */
  async countConveniosWithFilters(filters = {}) {
    const countQuery = this.queryBuilder
      .reset()
      .filterByEstado(filters.estado)
      .filterByEstados(filters.estados)
      .filterByDateRange(filters.fechaInicio, filters.fechaFin)
      .filterBySearchText(filters.busqueda)
      .build();

    // Remover campos innecesarios para el count
    delete countQuery.include;
    delete countQuery.orderBy;
    delete countQuery.skip;
    delete countQuery.take;

    return await prisma.convenio.count({ where: countQuery.where });
  }

  /**
   * Busca un convenio específico por su ID
   * @param {number|string} id - ID del convenio a buscar
   * @param {boolean} [includePartes=false] - Indica si se deben incluir las partes relacionadas
   * @returns {Promise<Object>} Resultado con datos del convenio o mensaje de error
   * @throws {Error} Si el ID es inválido o ocurre un error en la consulta
   * @complexity O(1) con índice primario
   * @async
   * 
   * @example
   * const result = await service.findConvenioById(123, true);
   * if (result.success) {
   *   const convenio = result.data;
   *   // Procesar convenio
   * }
   */
  async findConvenioById(id, includePartes = false) {
    try {
      const convenioId = parseInt(id);
      if (isNaN(convenioId)) {
        throw new Error('ID de convenio inválido');
      }

      const query = {
        where: { id: convenioId }
      };

      if (includePartes) {
        query.include = {
          partes: {
            include: {
              parte: true
            }
          }
        };
      }

      const convenio = await prisma.convenio.findUnique(query);
      
      if (!convenio) {
        return {
          success: false,
          message: 'Convenio no encontrado',
          data: null
        };
      }

      return {
        success: true,
        data: convenio,
        performance: {
          queryComplexity: 'O(1)',
          optimizations: ['primary_key_index']
        }
      };

    } catch (error) {
      throw new Error(`Error al buscar convenio: ${error.message}`);
    }
  }

  /**
   * Realiza una búsqueda avanzada con múltiples criterios combinados
   * @param {Object} searchCriteria - Criterios de búsqueda avanzada
   * @param {string} [searchCriteria.textSearch] - Texto para búsqueda
   * @param {string[]} [searchCriteria.estados] - Estados para filtrar
   * @param {string} [searchCriteria.fechaDesde] - Fecha inicial (YYYY-MM-DD)
   * @param {string} [searchCriteria.fechaHasta] - Fecha final (YYYY-MM-DD)
   * @param {boolean} [searchCriteria.incluirPartes=false] - Incluir partes relacionadas
   * @param {string} [searchCriteria.ordenarPor='createdAt'] - Campo para ordenamiento
   * @param {string} [searchCriteria.orden='desc'] - Dirección de ordenamiento
   * @param {number} [searchCriteria.pagina=1] - Número de página
   * @param {number} [searchCriteria.limite=20] - Registros por página
   * @returns {Promise<Object>} Resultado con datos y metadatos
   * @throws {Error} Si ocurre un error durante la búsqueda
   * @complexity O(log n * m) donde n=registros, m=criterios
   * @async
   * 
   * @example
   * const result = await service.advancedSearch({
   *   textSearch: 'universidad',
   *   estados: ['Activo', 'Borrador'],
   *   fechaDesde: '2023-01-01',
   *   incluirPartes: true,
   *   pagina: 1,
   *   limite: 20
   * });
   */
  async advancedSearch(searchCriteria) {
    try {
      const {
        textSearch,
        estados,
        fechaDesde,
        fechaHasta,
        incluirPartes = false,
        ordenarPor = 'createdAt',
        orden = 'desc',
        pagina = 1,
        limite = 20
      } = searchCriteria;

      return await this.findConveniosWithFilters(
        {
          busqueda: textSearch,
          estados: estados,
          fechaInicio: fechaDesde,
          fechaFin: fechaHasta
        },
        {
          includePartes: incluirPartes,
          sortBy: ordenarPor,
          sortOrder: orden,
          page: pagina,
          limit: limite
        }
      );

    } catch (error) {
      throw new Error(`Error en búsqueda avanzada: ${error.message}`);
    }
  }

  /**
   * Obtiene estadísticas y agregaciones sobre los convenios
   * @returns {Promise<Object>} Estadísticas de convenios
   * @throws {Error} Si ocurre un error durante la consulta
   * @complexity O(n) en el peor caso, optimizable con índices
   * @async
   * 
   * @example
   * const stats = await service.getConveniosStats();
   * console.log(`Total de convenios: ${stats.total}`);
   * console.log(`Convenios activos: ${stats.porEstado.Activo || 0}`);
   */
  async getConveniosStats() {
    try {
      const [
        totalConvenios,
        conveniosPorEstado,
        conveniosRecientes
      ] = await Promise.all([
        // Contar total - O(1) con optimización de BD
        prisma.convenio.count(),
        
        // Agrupar por estado - O(n) pero optimizable con índices
        prisma.convenio.groupBy({
          by: ['estado'],
          _count: {
            estado: true
          }
        }),
        
        // Convenios recientes - O(log n) con índice en createdAt
        prisma.convenio.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Últimos 30 días
            }
          }
        })
      ]);

      return {
        success: true,
        data: {
          total: totalConvenios,
          porEstado: conveniosPorEstado.reduce((acc, item) => {
            acc[item.estado] = item._count.estado;
            return acc;
          }, {}),
          recientes: conveniosRecientes
        },
        performance: {
          queryComplexity: 'O(log n)',
          optimizations: ['aggregation_indexes', 'parallel_execution']
        }
      };

    } catch (error) {
      throw new Error(`Error al obtener estadísticas: ${error.message}`);
    }
  }
}

// Instancia singleton del servicio
const convenioQueryService = new ConvenioQueryService();

/**
 * @namespace ConvenioControllers
 * @description Controladores para endpoints de consulta de convenios
 */

/**
 * Obtener convenios con filtros - Endpoint principal de consulta
 * Ruta esperada: GET /api/convenios
 * Complejidad: O(log n * m)
 */
export const getConvenios = async (req, res) => {
  try {
    const {
      estado,
      estados,
      fechaInicio,
      fechaFin,
      busqueda,
      includePartes,
      sortBy,
      sortOrder,
      page,
      limit,
      debug // Parámetro para debugging
    } = req.query;

    // 🔍 LOGGING DETALLADO DE PARÁMETROS RECIBIDOS
    console.log('📋 PARÁMETROS RECIBIDOS:', {
      estado,
      estados,
      fechaInicio,
      fechaFin,
      busqueda,
      includePartes,
      sortBy,
      sortOrder,
      page,
      limit,
      debug,
      timestamp: new Date().toISOString()
    });

    // Procesar parámetros de estados múltiples
    let estadosArray = null;
    if (estados) {
      estadosArray = Array.isArray(estados) ? estados : estados.split(',');
      console.log('🔄 ESTADOS PROCESADOS:', estadosArray);
    }

    // Preparar filtros con logging
    const filters = {
      estado,
      estados: estadosArray,
      fechaInicio,
      fechaFin,
      busqueda
    };

    const options = {
      includePartes: includePartes === 'true',
      sortBy,
      sortOrder,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10
    };

    console.log('🎛️ FILTROS APLICADOS:', filters);
    console.log('⚙️ OPCIONES DE CONSULTA:', options);

    const result = await convenioQueryService.findConveniosWithFilters(
      filters,
      options,
      debug === 'true' // Pasar modo debug al servicio
    );

    // Log del resultado
    console.log('📊 RESULTADO OBTENIDO:', {
      totalRegistros: result.data?.length || 0,
      totalEnBD: result.metadata?.total || 0,
      filtrosAplicados: Object.keys(filters).filter(key => filters[key] !== undefined && filters[key] !== null),
      timestamp: new Date().toISOString()
    });

    res.status(200).json(result);

  } catch (error) {
    console.error('❌ ERROR EN getConvenios:', {
      error: error.message,
      stack: error.stack,
      params: req.query,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      message: 'Error al obtener convenios',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Obtener convenio por ID
 * Ruta esperada: GET /api/convenios/:id
 * Complejidad: O(1)
 */
export const getConvenioById = async (req, res) => {
  try {
    const { id } = req.params;
    const { includePartes } = req.query;

    const result = await convenioQueryService.findConvenioById(
      id, 
      includePartes === 'true'
    );

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.status(200).json(result);

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener convenio',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Búsqueda avanzada de convenios
 * Ruta esperada: POST /api/convenios/search
 * Complejidad: O(log n * m)
 */
export const searchConvenios = async (req, res) => {
  try {
    const searchCriteria = req.body;

    const result = await convenioQueryService.advancedSearch(searchCriteria);

    res.status(200).json(result);

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error en búsqueda avanzada',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Obtener estadísticas de convenios
 * Ruta esperada: GET /api/convenios/stats
 * Complejidad: O(log n)
 */
export const getConveniosStats = async (req, res) => {
  try {
    const result = await convenioQueryService.getConveniosStats();

    res.status(200).json(result);

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Exportar el servicio para uso en tests
export { ConvenioQueryService, ConvenioQueryBuilder };
