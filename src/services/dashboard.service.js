import { prisma } from '../lib/prisma.js';

/**
 * Servicio para consultas de agregación del dashboard
 * Proporciona métricas clave para Decanos y Administradores
 */

/**
 * Obtener número de convenios activos
 * @returns {Promise<number>} Cantidad de convenios con estado 'Activo'
 */
export const getConveniosActivos = async () => {
  try {
    const count = await prisma.convenio.count({
      where: {
        estado: 'Activo'
      }
    });
    return count;
  } catch (error) {
    console.error('Error al contar convenios activos:', error);
    throw new Error('Error al obtener convenios activos');
  }
};

/**
 * Obtener número de convenios próximos a vencer en los próximos 90 días
 * @param {number} dias - Número de días para considerar "próximo a vencer" (default: 90)
 * @returns {Promise<number>} Cantidad de convenios que vencen en el período especificado
 */
export const getConveniosProximosVencer = async (dias = 90) => {
  try {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + dias);

    const count = await prisma.convenio.count({
      where: {
        AND: [
          {
            estado: 'Activo' // Solo convenios activos pueden estar próximos a vencer
          },
          {
            fechaFin: {
              lte: fechaLimite // fecha_fin <= fecha actual + 90 días
            }
          },
          {
            fechaFin: {
              gte: new Date() // fecha_fin >= fecha actual (no vencidos)
            }
          }
        ]
      }
    });
    return count;
  } catch (error) {
    console.error('Error al contar convenios próximos a vencer:', error);
    throw new Error('Error al obtener convenios próximos a vencer');
  }
};

/**
 * Obtener lista detallada de convenios próximos a vencer
 * @param {number} dias - Número de días para considerar "próximo a vencer" (default: 90)
 * @param {number} limit - Límite de resultados (default: 10)
 * @returns {Promise<Array>} Lista de convenios próximos a vencer con detalles
 */
export const getDetalleConveniosProximosVencer = async (dias = 90, limit = 10) => {
  try {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + dias);

    const convenios = await prisma.convenio.findMany({
      where: {
        AND: [
          {
            estado: 'Activo'
          },
          {
            fechaFin: {
              lte: fechaLimite
            }
          },
          {
            fechaFin: {
              gte: new Date()
            }
          }
        ]
      },
      select: {
        id: true,
        titulo: true,
        fechaFin: true,
        estado: true,
        partes: {
          select: {
            parte: {
              select: {
                nombre: true,
                tipo: true
              }
            }
          }
        }
      },
      orderBy: {
        fechaFin: 'asc' // Los que vencen más pronto primero
      },
      take: limit
    });

    // Calcular días restantes para cada convenio
    const conveniosConDias = convenios.map(convenio => {
      const diasRestantes = Math.ceil(
        (new Date(convenio.fechaFin) - new Date()) / (1000 * 60 * 60 * 24)
      );
      
      return {
        ...convenio,
        diasRestantes,
        urgencia: diasRestantes <= 30 ? 'alta' : diasRestantes <= 60 ? 'media' : 'baja'
      };
    });

    return conveniosConDias;
  } catch (error) {
    console.error('Error al obtener detalle de convenios próximos a vencer:', error);
    throw new Error('Error al obtener detalle de convenios próximos a vencer');
  }
};

/**
 * Obtener número total de convenios por estado
 * @returns {Promise<Object>} Objeto con conteo por cada estado
 */
export const getConveniosPorEstado = async () => {
  try {
    const estadisticas = await prisma.convenio.groupBy({
      by: ['estado'],
      _count: {
        id: true
      }
    });

    // Convertir array a objeto para fácil acceso
    const resultado = {
      Borrador: 0,
      Activo: 0,
      Finalizado: 0,
      Archivado: 0
    };

    estadisticas.forEach(stat => {
      resultado[stat.estado] = stat._count.id;
    });

    return resultado;
  } catch (error) {
    console.error('Error al obtener convenios por estado:', error);
    throw new Error('Error al obtener convenios por estado');
  }
};

/**
 * Obtener número de actividades por estado
 * @returns {Promise<Object>} Objeto con conteo de actividades por estado
 */
export const getActividadesPorEstado = async () => {
  try {
    const estadisticas = await prisma.actividad.groupBy({
      by: ['estado'],
      _count: {
        id: true
      }
    });

    const resultado = {
      Planeada: 0,
      EnProgreso: 0,
      Completada: 0
    };

    estadisticas.forEach(stat => {
      resultado[stat.estado] = stat._count.id;
    });

    return resultado;
  } catch (error) {
    console.error('Error al obtener actividades por estado:', error);
    throw new Error('Error al obtener actividades por estado');
  }
};

/**
 * Obtener número total de productos generados
 * @returns {Promise<number>} Total de productos registrados
 */
export const getTotalProductos = async () => {
  try {
    const count = await prisma.producto.count();
    return count;
  } catch (error) {
    console.error('Error al contar productos:', error);
    throw new Error('Error al obtener total de productos');
  }
};

/**
 * Obtener productos por tipo
 * @returns {Promise<Object>} Objeto con conteo de productos por tipo
 */
export const getProductosPorTipo = async () => {
  try {
    const estadisticas = await prisma.producto.groupBy({
      by: ['tipo'],
      _count: {
        id: true
      }
    });

    const resultado = {};
    estadisticas.forEach(stat => {
      resultado[stat.tipo] = stat._count.id;
    });

    return resultado;
  } catch (error) {
    console.error('Error al obtener productos por tipo:', error);
    throw new Error('Error al obtener productos por tipo');
  }
};

/**
 * Obtener métricas completas del dashboard
 * @returns {Promise<Object>} Objeto con todas las métricas del dashboard
 */
export const getMetricasCompletas = async () => {
  try {
    const [
      conveniosActivos,
      conveniosProximosVencer,
      conveniosPorEstado,
      actividadesPorEstado,
      totalProductos,
      productosPorTipo,
      detalleProximosVencer
    ] = await Promise.all([
      getConveniosActivos(),
      getConveniosProximosVencer(),
      getConveniosPorEstado(),
      getActividadesPorEstado(),
      getTotalProductos(),
      getProductosPorTipo(),
      getDetalleConveniosProximosVencer(90, 5)
    ]);

    return {
      convenios: {
        activos: conveniosActivos,
        proximosVencer: conveniosProximosVencer,
        porEstado: conveniosPorEstado,
        detalleProximosVencer
      },
      actividades: {
        porEstado: actividadesPorEstado,
        total: Object.values(actividadesPorEstado).reduce((sum, count) => sum + count, 0)
      },
      productos: {
        total: totalProductos,
        porTipo: productosPorTipo
      },
      resumen: {
        totalConvenios: Object.values(conveniosPorEstado).reduce((sum, count) => sum + count, 0),
        conveniosActivos,
        conveniosProximosVencer,
        totalActividades: Object.values(actividadesPorEstado).reduce((sum, count) => sum + count, 0),
        totalProductos
      }
    };
  } catch (error) {
    console.error('Error al obtener métricas completas:', error);
    throw new Error('Error al obtener métricas del dashboard');
  }
};

/**
 * Obtener tendencias mensuales de convenios (últimos 12 meses)
 * @returns {Promise<Array>} Array con datos de tendencias por mes
 */
export const getTendenciasConvenios = async () => {
  try {
    const hace12Meses = new Date();
    hace12Meses.setMonth(hace12Meses.getMonth() - 12);

    const conveniosPorMes = await prisma.convenio.findMany({
      where: {
        fechaInicio: {
          gte: hace12Meses
        }
      },
      select: {
        fechaInicio: true,
        estado: true
      }
    });

    // Agrupar por mes
    const tendencias = {};
    conveniosPorMes.forEach(convenio => {
      const mes = new Date(convenio.fechaInicio).toISOString().substring(0, 7); // YYYY-MM
      if (!tendencias[mes]) {
        tendencias[mes] = { total: 0, activos: 0 };
      }
      tendencias[mes].total++;
      if (convenio.estado === 'Activo') {
        tendencias[mes].activos++;
      }
    });

    return Object.entries(tendencias)
      .map(([mes, datos]) => ({ mes, ...datos }))
      .sort((a, b) => a.mes.localeCompare(b.mes));
  } catch (error) {
    console.error('Error al obtener tendencias:', error);
    throw new Error('Error al obtener tendencias de convenios');
  }
};