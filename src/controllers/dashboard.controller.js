import {
  getConveniosActivos,
  getConveniosProximosVencer,
  getDetalleConveniosProximosVencer,
  getConveniosPorEstado,
  getActividadesPorEstado,
  getTotalProductos,
  getProductosPorTipo,
  getMetricasCompletas,
  getTendenciasConvenios
} from '../services/dashboard.service.js';

/**
 * Roles autorizados para acceder al dashboard
 */
const ROLES_DASHBOARD = ['ADMIN', 'GESTOR'];

/**
 * Verificar si el usuario tiene permisos para acceder al dashboard
 */
const verificarPermisosDecano = (userRole) => {
  return ROLES_DASHBOARD.includes(userRole);
};

/**
 * Obtener métricas principales del dashboard
 * Endpoint principal para Decanos y Administradores
 */
export const getDashboardMetricas = async (req, res) => {
  try {
    // Verificar permisos de rol
    if (!verificarPermisosDecano(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado - Esta vista está restringida a roles Decano y Administrador',
        error: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: ROLES_DASHBOARD,
        userRole: req.user.rol
      });
    }

    // Obtener todas las métricas
    const metricas = await getMetricasCompletas();

    res.json({
      success: true,
      message: 'Métricas del dashboard obtenidas exitosamente',
      data: {
        ...metricas,
        fechaActualizacion: new Date().toISOString(),
        usuario: {
          id: req.user.id,
          email: req.user.email,
          rol: req.user.rol
        }
      }
    });

  } catch (error) {
    console.error('Error al obtener métricas del dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener métricas',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * Obtener solo las métricas clave (convenios activos y próximos a vencer)
 * Endpoint optimizado para widgets principales
 */
export const getMetricasClave = async (req, res) => {
  try {
    // Verificar permisos
    if (!verificarPermisosDecano(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    const diasVencimiento = parseInt(req.query.dias) || 90;

    // Obtener métricas principales en paralelo
    const [conveniosActivos, conveniosProximosVencer] = await Promise.all([
      getConveniosActivos(),
      getConveniosProximosVencer(diasVencimiento)
    ]);

    res.json({
      success: true,
      message: 'Métricas clave obtenidas exitosamente',
      data: {
        conveniosActivos,
        conveniosProximosVencer,
        diasConsiderados: diasVencimiento,
        fechaConsulta: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error al obtener métricas clave:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener métricas clave',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * Obtener detalle de convenios próximos a vencer
 * Lista específica para alertas y seguimiento
 */
export const getConveniosVencimiento = async (req, res) => {
  try {
    // Verificar permisos
    if (!verificarPermisosDecano(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    const dias = parseInt(req.query.dias) || 90;
    const limit = parseInt(req.query.limit) || 10;

    const conveniosDetalle = await getDetalleConveniosProximosVencer(dias, limit);

    res.json({
      success: true,
      message: 'Convenios próximos a vencer obtenidos exitosamente',
      data: {
        convenios: conveniosDetalle,
        total: conveniosDetalle.length,
        diasConsiderados: dias,
        parametros: {
          limit,
          dias
        }
      }
    });

  } catch (error) {
    console.error('Error al obtener convenios próximos a vencer:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener convenios próximos a vencer',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * Obtener estadísticas de convenios por estado
 */
export const getEstadisticasConvenios = async (req, res) => {
  try {
    // Verificar permisos
    if (!verificarPermisosDecano(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    const estadisticas = await getConveniosPorEstado();

    res.json({
      success: true,
      message: 'Estadísticas de convenios obtenidas exitosamente',
      data: {
        porEstado: estadisticas,
        total: Object.values(estadisticas).reduce((sum, count) => sum + count, 0),
        porcentajes: Object.fromEntries(
          Object.entries(estadisticas).map(([estado, count]) => [
            estado,
            {
              cantidad: count,
              porcentaje: parseFloat(
                ((count / Object.values(estadisticas).reduce((sum, c) => sum + c, 0)) * 100).toFixed(2)
              )
            }
          ])
        )
      }
    });

  } catch (error) {
    console.error('Error al obtener estadísticas de convenios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de convenios',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * Obtener resumen ejecutivo para la página principal
 * Vista compacta con información esencial
 */
export const getResumenEjecutivo = async (req, res) => {
  try {
    // Verificar permisos
    if (!verificarPermisosDecano(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado - Vista ejecutiva restringida',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // Obtener datos básicos en paralelo
    const [
      conveniosActivos,
      conveniosProximosVencer,
      conveniosPorEstado,
      actividadesPorEstado,
      totalProductos
    ] = await Promise.all([
      getConveniosActivos(),
      getConveniosProximosVencer(90),
      getConveniosPorEstado(),
      getActividadesPorEstado(),
      getTotalProductos()
    ]);

    // Calcular métricas derivadas
    const totalConvenios = Object.values(conveniosPorEstado).reduce((sum, count) => sum + count, 0);
    const totalActividades = Object.values(actividadesPorEstado).reduce((sum, count) => sum + count, 0);

    // Determinar estado general
    const porcentajeActivos = totalConvenios > 0 ? (conveniosActivos / totalConvenios) * 100 : 0;
    const estadoGeneral = porcentajeActivos >= 70 ? 'excelente' : 
                         porcentajeActivos >= 50 ? 'bueno' : 'requiere_atencion';

    res.json({
      success: true,
      message: 'Resumen ejecutivo obtenido exitosamente',
      data: {
        widgets: {
          conveniosActivos: {
            valor: conveniosActivos,
            label: 'Convenios Activos',
            tipo: 'primary',
            icono: '📋'
          },
          conveniosProximosVencer: {
            valor: conveniosProximosVencer,
            label: 'Próximos a Vencer (90 días)',
            tipo: conveniosProximosVencer > 0 ? 'warning' : 'success',
            icono: '⚠️'
          },
          totalActividades: {
            valor: totalActividades,
            label: 'Total Actividades',
            tipo: 'info',
            icono: '🎯'
          },
          totalProductos: {
            valor: totalProductos,
            label: 'Productos Generados',
            tipo: 'success',
            icono: '🏭'
          }
        },
        indicadores: {
          porcentajeActivos: parseFloat(porcentajeActivos.toFixed(2)),
          estadoGeneral,
          totalConvenios,
          actividadesCompletadas: actividadesPorEstado.Completada || 0
        },
        alertas: {
          conveniosVencen: conveniosProximosVencer > 0,
          cantidadAlertas: conveniosProximosVencer,
          mensaje: conveniosProximosVencer > 0 
            ? `${conveniosProximosVencer} convenio(s) vencen en los próximos 90 días`
            : 'No hay convenios próximos a vencer'
        },
        fechaActualizacion: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error al obtener resumen ejecutivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener resumen ejecutivo',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * Obtener tendencias históricas
 */
export const getTendencias = async (req, res) => {
  try {
    // Verificar permisos
    if (!verificarPermisosDecano(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    const tendencias = await getTendenciasConvenios();

    res.json({
      success: true,
      message: 'Tendencias obtenidas exitosamente',
      data: {
        tendenciasMensuales: tendencias,
        periodo: 'Últimos 12 meses',
        totalMeses: tendencias.length
      }
    });

  } catch (error) {
    console.error('Error al obtener tendencias:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tendencias',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
};