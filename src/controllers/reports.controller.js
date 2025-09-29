import {
  generateReportData,
  validateDateParameters,
  getActividadesByDateRange,
  getResumenActividadesByDateRange,
  formatActividadesForCSV,
  generateReportPDF
} from '../services/reports.service.js';

/**
 * Controlador para gestión de reportes de actividades
 * Maneja la generación, validación y exportación de reportes
 */

/**
 * Roles autorizados para generar reportes
 */
const ROLES_REPORTES = ['ADMIN', 'GESTOR'];

/**
 * Verificar permisos para generar reportes
 */
const verificarPermisosReportes = (userRole) => {
  return ROLES_REPORTES.includes(userRole);
};

/**
 * Generar reporte de actividades por rango de fechas
 * Endpoint principal: GET /api/reports/activities
 */
export const getActivitiesReport = async (req, res) => {
  try {
    // Verificar permisos
    if (!verificarPermisosReportes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado - Se requiere rol Gestor o Administrador para generar reportes',
        error: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: ROLES_REPORTES,
        userRole: req.user.rol
      });
    }

    // Obtener parámetros de fecha
    const { fechaInicio, fechaFin, formato = 'json' } = req.query;

    // Validar parámetros requeridos
    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        success: false,
        message: 'Los parámetros fechaInicio y fechaFin son requeridos',
        error: 'MISSING_REQUIRED_PARAMETERS',
        example: {
          fechaInicio: '2025-01-01',
          fechaFin: '2025-12-31',
          formato: 'json|csv'
        }
      });
    }

    // Validar y parsear fechas
    let fechasValidadas;
    try {
      fechasValidadas = validateDateParameters(fechaInicio, fechaFin);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Error en parámetros de fecha',
        error: 'INVALID_DATE_PARAMETERS',
        details: error.message
      });
    }

    // Generar reporte
    const reportData = await generateReportData(
      fechasValidadas.fechaInicio,
      fechasValidadas.fechaFin
    );

    // Si se solicita formato CSV, retornar CSV
    if (formato === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="reporte_actividades_${fechaInicio}_${fechaFin}.csv"`);
      
      const csvHeaders = Object.keys(reportData.export.csv[0] || {}).join(',');
      const csvRows = reportData.export.csv.map(row => 
        Object.values(row).map(value => 
          `"${String(value).replace(/"/g, '""')}"`
        ).join(',')
      );
      
      return res.send([csvHeaders, ...csvRows].join('\n'));
    }

    // Respuesta JSON por defecto
    res.json({
      success: true,
      message: 'Reporte generado exitosamente',
      data: {
        ...reportData,
        parametros: {
          fechaInicio,
          fechaFin,
          diasPeriodo: fechasValidadas.diasPeriodo,
          usuario: {
            id: req.user.id,
            email: req.user.email,
            rol: req.user.rol
          }
        }
      }
    });

  } catch (error) {
    console.error('Error al generar reporte de actividades:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al generar reporte',
      error: 'INTERNAL_SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obtener vista previa del reporte (solo metadatos y resumen)
 * Endpoint optimizado: GET /api/reports/activities/preview
 */
export const getActivitiesReportPreview = async (req, res) => {
  try {
    // Verificar permisos
    if (!verificarPermisosReportes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        success: false,
        message: 'Los parámetros fechaInicio y fechaFin son requeridos',
        error: 'MISSING_REQUIRED_PARAMETERS'
      });
    }

    // Validar fechas
    let fechasValidadas;
    try {
      fechasValidadas = validateDateParameters(fechaInicio, fechaFin);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Error en parámetros de fecha',
        error: 'INVALID_DATE_PARAMETERS',
        details: error.message
      });
    }

    // Obtener solo el resumen (más rápido)
    const resumen = await getResumenActividadesByDateRange(
      fechasValidadas.fechaInicio,
      fechasValidadas.fechaFin
    );

    res.json({
      success: true,
      message: 'Vista previa del reporte generada exitosamente',
      data: {
        preview: true,
        resumen,
        parametros: {
          fechaInicio,
          fechaFin,
          diasPeriodo: fechasValidadas.diasPeriodo
        },
        estimacion: {
          tiempoGeneracion: resumen.totales.actividades < 100 ? 'rápido' : 
                           resumen.totales.actividades < 500 ? 'medio' : 'lento',
          registrosEstimados: resumen.totales.actividades
        }
      }
    });

  } catch (error) {
    console.error('Error al generar vista previa del reporte:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar vista previa',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * Obtener lista de actividades sin datos relacionados (más liviano)
 * Endpoint: GET /api/reports/activities/list
 */
export const getActivitiesList = async (req, res) => {
  try {
    // Verificar permisos
    if (!verificarPermisosReportes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    const { fechaInicio, fechaFin, page = 1, limit = 50 } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        success: false,
        message: 'Los parámetros fechaInicio y fechaFin son requeridos',
        error: 'MISSING_REQUIRED_PARAMETERS'
      });
    }

    // Validar fechas
    let fechasValidadas;
    try {
      fechasValidadas = validateDateParameters(fechaInicio, fechaFin);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Error en parámetros de fecha',
        error: 'INVALID_DATE_PARAMETERS',
        details: error.message
      });
    }

    // Obtener actividades con paginación
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const actividades = await getActividadesByDateRange(
      fechasValidadas.fechaInicio,
      fechasValidadas.fechaFin
    );

    // Aplicar paginación en memoria (para simplificar)
    const paginatedActividades = actividades.slice(offset, offset + parseInt(limit));

    res.json({
      success: true,
      message: 'Lista de actividades obtenida exitosamente',
      data: {
        actividades: paginatedActividades,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: actividades.length,
          totalPages: Math.ceil(actividades.length / parseInt(limit)),
          hasNext: offset + parseInt(limit) < actividades.length,
          hasPrev: parseInt(page) > 1
        },
        parametros: {
          fechaInicio,
          fechaFin,
          diasPeriodo: fechasValidadas.diasPeriodo
        }
      }
    });

  } catch (error) {
    console.error('Error al obtener lista de actividades:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener lista de actividades',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * Exportar reporte a CSV con descarga directa
 * Endpoint: GET /api/reports/activities/export/csv
 */
export const exportActivitiesCSV = async (req, res) => {
  try {
    // Verificar permisos
    if (!verificarPermisosReportes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        success: false,
        message: 'Los parámetros fechaInicio y fechaFin son requeridos',
        error: 'MISSING_REQUIRED_PARAMETERS'
      });
    }

    // Validar fechas
    let fechasValidadas;
    try {
      fechasValidadas = validateDateParameters(fechaInicio, fechaFin);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Error en parámetros de fecha',
        error: 'INVALID_DATE_PARAMETERS',
        details: error.message
      });
    }

    // Obtener actividades
    const actividades = await getActividadesByDateRange(
      fechasValidadas.fechaInicio,
      fechasValidadas.fechaFin
    );

    // Formatear para CSV
    const csvData = formatActividadesForCSV(actividades);

    // Generar CSV
    const csvHeaders = Object.keys(csvData[0] || {}).join(',');
    const csvRows = csvData.map(row => 
      Object.values(row).map(value => 
        `"${String(value || '').replace(/"/g, '""')}"`
      ).join(',')
    );

    const csvContent = [csvHeaders, ...csvRows].join('\n');

    // Configurar headers para descarga
    const filename = `reporte_actividades_${fechaInicio}_${fechaFin}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf8'));

    // Enviar CSV
    res.send('\ufeff' + csvContent); // BOM para UTF-8

  } catch (error) {
    console.error('Error al exportar CSV:', error);
    res.status(500).json({
      success: false,
      message: 'Error al exportar reporte a CSV',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * Obtener estadísticas de reportes disponibles
 * Endpoint: GET /api/reports/stats
 */
export const getReportsStats = async (req, res) => {
  try {
    // Verificar permisos
    if (!verificarPermisosReportes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // Obtener estadísticas generales
    const fechaActual = new Date();
    const fechaInicioAno = new Date(fechaActual.getFullYear(), 0, 1);
    const fechaInicioMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1);

    const [statsAno, statsMes] = await Promise.all([
      getResumenActividadesByDateRange(fechaInicioAno, fechaActual),
      getResumenActividadesByDateRange(fechaInicioMes, fechaActual)
    ]);

    res.json({
      success: true,
      message: 'Estadísticas de reportes obtenidas exitosamente',
      data: {
        estadisticas: {
          añoActual: {
            periodo: `${fechaInicioAno.toISOString().split('T')[0]} - ${fechaActual.toISOString().split('T')[0]}`,
            ...statsAno
          },
          mesActual: {
            periodo: `${fechaInicioMes.toISOString().split('T')[0]} - ${fechaActual.toISOString().split('T')[0]}`,
            ...statsMes
          }
        },
        tiposReporte: [
          {
            tipo: 'actividades',
            descripcion: 'Reporte de actividades por rango de fechas',
            formatos: ['JSON', 'CSV'],
            rolesPermitidos: ROLES_REPORTES
          }
        ],
        limitaciones: {
          rangoMaximo: '730 días',
          formatosDisponibles: ['JSON', 'CSV', 'PDF'],
          rolesPermitidos: ROLES_REPORTES
        }
      }
    });

  } catch (error) {
    console.error('Error al obtener estadísticas de reportes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * Exportar reporte de actividades a PDF
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
export const exportActivitiesPDF = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        success: false,
        message: 'Los parámetros fechaInicio y fechaFin son requeridos',
        error: 'MISSING_REQUIRED_PARAMETERS'
      });
    }

    // Validar fechas
    let fechasValidadas;
    try {
      fechasValidadas = await validateDateParameters(fechaInicio, fechaFin);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
        error: 'INVALID_DATE_PARAMETERS'
      });
    }

    // Generar datos del reporte
    const reportData = await generateReportData(
      fechasValidadas.fechaInicio,
      fechasValidadas.fechaFin,
      req.user?.correoElectronico || 'Sistema'
    );

    // Generar PDF
    const pdfBuffer = await generateReportPDF(reportData, {
      format: 'A4',
      landscape: false,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });

    // Configurar headers para descarga
    const fileName = `reporte_actividades_${fechaInicio}_${fechaFin}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Log de la operación
    console.log(`📄 PDF generado: ${fileName} - Usuario: ${req.user?.correoElectronico || 'Anónimo'} - Tamaño: ${pdfBuffer.length} bytes`);
    
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error al exportar PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar archivo PDF',
      error: 'EXPORT_PDF_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};