import { prisma } from '../lib/prisma.js';
import puppeteer from 'puppeteer';

/**
 * Servicio para generación de reportes de actividades
 * Proporciona consultas optimizadas y formateo de datos para reportes
 */

/**
 * Obtener actividades por rango de fechas con información completa
 * @param {Date} fechaInicio - Fecha de inicio del rango
 * @param {Date} fechaFin - Fecha de fin del rango
 * @returns {Promise<Array>} Lista de actividades con información relacionada
 */
export const getActividadesByDateRange = async (fechaInicio, fechaFin) => {
  try {
    const actividades = await prisma.actividad.findMany({
      where: {
        OR: [
          // Actividades que inician en el rango
          {
            fechaInicio: {
              gte: fechaInicio,
              lte: fechaFin
            }
          },
          // Actividades que terminan en el rango
          {
            fechaFin: {
              gte: fechaInicio,
              lte: fechaFin
            }
          },
          // Actividades que abarcan todo el rango
          {
            AND: [
              {
                fechaInicio: {
                  lte: fechaInicio
                }
              },
              {
                fechaFin: {
                  gte: fechaFin
                }
              }
            ]
          }
        ]
      },
      include: {
        convenio: {
          select: {
            id: true,
            titulo: true,
            estado: true,
            partes: {
              include: {
                parte: {
                  select: {
                    nombre: true,
                    tipo: true
                  }
                }
              }
            }
          }
        },
        responsable: {
          select: {
            id: true,
            email: true
          }
        },
        participantes: {
          select: {
            id: true,
            nombreCompleto: true,
            correoElectronico: true,
            rol: true
          }
        },
        productos: {
          select: {
            id: true,
            nombre: true,
            tipo: true,
            descripcion: true,
            enlace: true,
            createdAt: true
          }
        }
      },
      orderBy: [
        { fechaInicio: 'asc' },
        { nombre: 'asc' }
      ]
    });

    return actividades;
  } catch (error) {
    console.error('Error al obtener actividades por rango de fechas:', error);
    throw new Error('Error al consultar actividades');
  }
};

/**
 * Generar resumen estadístico de actividades por rango de fechas
 * @param {Date} fechaInicio - Fecha de inicio del rango
 * @param {Date} fechaFin - Fecha de fin del rango
 * @returns {Promise<Object>} Resumen estadístico
 */
export const getResumenActividadesByDateRange = async (fechaInicio, fechaFin) => {
  try {
    const actividades = await getActividadesByDateRange(fechaInicio, fechaFin);

    // Calcular estadísticas
    const resumen = {
      periodo: {
        fechaInicio: fechaInicio.toISOString().split('T')[0],
        fechaFin: fechaFin.toISOString().split('T')[0],
        diasPeriodo: Math.ceil((fechaFin - fechaInicio) / (1000 * 60 * 60 * 24))
      },
      totales: {
        actividades: actividades.length,
        conveniosInvolucrados: new Set(actividades.map(a => a.convenioId)).size,
        responsablesInvolucrados: new Set(actividades.map(a => a.responsableId)).size,
        totalParticipantes: actividades.reduce((sum, a) => sum + a.participantes.length, 0),
        totalProductos: actividades.reduce((sum, a) => sum + a.productos.length, 0)
      },
      porEstado: {
        Planeada: actividades.filter(a => a.estado === 'Planeada').length,
        EnProgreso: actividades.filter(a => a.estado === 'EnProgreso').length,
        Completada: actividades.filter(a => a.estado === 'Completada').length
      },
      porMes: {}
    };

    // Agrupar por mes
    actividades.forEach(actividad => {
      const mes = actividad.fechaInicio.toISOString().substring(0, 7); // YYYY-MM
      if (!resumen.porMes[mes]) {
        resumen.porMes[mes] = 0;
      }
      resumen.porMes[mes]++;
    });

    // Calcular porcentajes
    resumen.porcentajes = {
      Planeada: resumen.totales.actividades > 0 
        ? (resumen.porEstado.Planeada / resumen.totales.actividades * 100).toFixed(2)
        : 0,
      EnProgreso: resumen.totales.actividades > 0 
        ? (resumen.porEstado.EnProgreso / resumen.totales.actividades * 100).toFixed(2)
        : 0,
      Completada: resumen.totales.actividades > 0 
        ? (resumen.porEstado.Completada / resumen.totales.actividades * 100).toFixed(2)
        : 0
    };

    return resumen;
  } catch (error) {
    console.error('Error al generar resumen de actividades:', error);
    throw new Error('Error al generar resumen estadístico');
  }
};

/**
 * Formatear datos de actividades para exportación CSV
 * @param {Array} actividades - Lista de actividades
 * @returns {Array} Array de objetos planos para CSV
 */
export const formatActividadesForCSV = (actividades) => {
  try {
    return actividades.map(actividad => {
      const partes = actividad.convenio.partes
        .map(cp => cp.parte.nombre)
        .join(', ');
      
      const participantes = actividad.participantes
        .map(p => `${p.nombreCompleto} (${p.rol})`)
        .join('; ');
      
      const productos = actividad.productos
        .map(p => `${p.nombre} [${p.tipo}]`)
        .join('; ');

      return {
        'ID Actividad': actividad.id,
        'Nombre Actividad': actividad.nombre,
        'Descripción': actividad.descripcion,
        'Estado': actividad.estado,
        'Fecha Inicio': actividad.fechaInicio.toISOString().split('T')[0],
        'Fecha Fin': actividad.fechaFin.toISOString().split('T')[0],
        'Convenio': actividad.convenio.titulo,
        'Estado Convenio': actividad.convenio.estado,
        'Partes Convenio': partes,
        'Responsable': actividad.responsable.email,
        'Participantes': participantes,
        'Total Participantes': actividad.participantes.length,
        'Productos': productos,
        'Total Productos': actividad.productos.length,
        'Fecha Creación': actividad.createdAt.toISOString().split('T')[0]
      };
    });
  } catch (error) {
    console.error('Error al formatear datos para CSV:', error);
    throw new Error('Error al formatear datos para exportación');
  }
};

/**
 * Formatear datos de actividades para exportación PDF
 * @param {Array} actividades - Lista de actividades
 * @param {Object} resumen - Resumen estadístico
 * @returns {Object} Datos estructurados para PDF
 */
export const formatActividadesForPDF = (actividades, resumen) => {
  try {
    const actividadesFormateadas = actividades.map(actividad => ({
      id: actividad.id,
      nombre: actividad.nombre,
      descripcion: actividad.descripcion.substring(0, 100) + (actividad.descripcion.length > 100 ? '...' : ''),
      estado: actividad.estado,
      fechaInicio: actividad.fechaInicio.toLocaleDateString('es-ES'),
      fechaFin: actividad.fechaFin.toLocaleDateString('es-ES'),
      convenio: {
        titulo: actividad.convenio.titulo,
        estado: actividad.convenio.estado,
        partes: actividad.convenio.partes.map(cp => cp.parte.nombre).join(', ')
      },
      responsable: actividad.responsable.email,
      estadisticas: {
        participantes: actividad.participantes.length,
        productos: actividad.productos.length
      },
      participantesDetalle: actividad.participantes.map(p => ({
        nombre: p.nombreCompleto,
        rol: p.rol,
        email: p.correoElectronico
      })),
      productosDetalle: actividad.productos.map(p => ({
        nombre: p.nombre,
        tipo: p.tipo,
        descripcion: p.descripcion.substring(0, 80) + (p.descripcion.length > 80 ? '...' : '')
      }))
    }));

    return {
      titulo: `Reporte de Actividades (${resumen.periodo.fechaInicio} - ${resumen.periodo.fechaFin})`,
      fechaGeneracion: new Date().toLocaleDateString('es-ES'),
      resumen,
      actividades: actividadesFormateadas
    };
  } catch (error) {
    console.error('Error al formatear datos para PDF:', error);
    throw new Error('Error al formatear datos para PDF');
  }
};

/**
 * Generar datos consolidados para reporte completo
 * @param {Date} fechaInicio - Fecha de inicio del rango
 * @param {Date} fechaFin - Fecha de fin del rango
 * @returns {Promise<Object>} Datos completos del reporte
 */
export const generateReportData = async (fechaInicio, fechaFin) => {
  try {
    // Validar fechas
    if (fechaInicio > fechaFin) {
      throw new Error('La fecha de inicio no puede ser mayor que la fecha de fin');
    }

    // Obtener datos
    const [actividades, resumen] = await Promise.all([
      getActividadesByDateRange(fechaInicio, fechaFin),
      getResumenActividadesByDateRange(fechaInicio, fechaFin)
    ]);

    // Formatear para diferentes formatos
    const csvData = formatActividadesForCSV(actividades);
    const pdfData = formatActividadesForPDF(actividades, resumen);

    return {
      meta: {
        fechaInicio: fechaInicio.toISOString(),
        fechaFin: fechaFin.toISOString(),
        fechaGeneracion: new Date().toISOString(),
        totalRegistros: actividades.length
      },
      resumen,
      actividades,
      export: {
        csv: csvData,
        pdf: pdfData
      }
    };
  } catch (error) {
    console.error('Error al generar datos del reporte:', error);
    throw error;
  }
};

/**
 * Validar parámetros de fecha para reportes
 * @param {string} fechaInicio - Fecha de inicio en formato string
 * @param {string} fechaFin - Fecha de fin en formato string
 * @returns {Object} Fechas validadas y parseadas
 */
export const validateDateParameters = (fechaInicio, fechaFin) => {
  try {
    // Parsear fechas
    const startDate = new Date(fechaInicio + 'T00:00:00.000Z');
    const endDate = new Date(fechaFin + 'T23:59:59.999Z');

    // Validar que las fechas sean válidas
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Formato de fecha inválido. Use YYYY-MM-DD');
    }

    // Validar que la fecha de inicio no sea mayor que la de fin
    if (startDate > endDate) {
      throw new Error('La fecha de inicio no puede ser mayor que la fecha de fin');
    }

    // Validar que no sea un rango demasiado amplio (máximo 2 años)
    const maxDays = 730; // 2 años
    const daysDiff = (endDate - startDate) / (1000 * 60 * 60 * 24);
    if (daysDiff > maxDays) {
      throw new Error(`El rango de fechas no puede exceder ${maxDays} días`);
    }

    return {
      fechaInicio: startDate,
      fechaFin: endDate,
      diasPeriodo: Math.ceil(daysDiff)
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Generar HTML para el reporte PDF
 * @param {Object} reportData - Datos del reporte
 * @returns {string} HTML formateado para PDF
 */
function generateReportHTML(reportData) {
  const { actividades, resumen, meta } = reportData;
  
  const activitiesHTML = actividades.map(actividad => {
    const fechaInicio = new Date(actividad.fechaInicio).toLocaleDateString('es-ES');
    const fechaFin = new Date(actividad.fechaFin).toLocaleDateString('es-ES');
    
    return `
      <tr>
        <td class="border">${actividad.id}</td>
        <td class="border">${actividad.nombre}</td>
        <td class="border">${actividad.descripcion || 'N/A'}</td>
        <td class="border">${actividad.convenio.titulo}</td>
        <td class="border">${fechaInicio}</td>
        <td class="border">${fechaFin}</td>
        <td class="border status-${actividad.estado.toLowerCase()}">${actividad.estado}</td>
        <td class="border text-center">${actividad.participantes.length}</td>
        <td class="border text-center">${actividad.productos.length}</td>
        <td class="border">${actividad.responsable.email}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Reporte de Actividades</title>
        <style>
            body {
                font-family: 'Arial', sans-serif;
                margin: 0;
                padding: 20px;
                font-size: 12px;
                line-height: 1.4;
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 3px solid #3498db;
                padding-bottom: 20px;
            }
            .header h1 {
                color: #2c3e50;
                font-size: 24px;
                margin-bottom: 10px;
            }
            .header .subtitle {
                color: #7f8c8d;
                font-size: 14px;
            }
            .meta-info {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
                border-left: 4px solid #3498db;
            }
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 15px;
                margin: 20px 0;
            }
            .stat-card {
                background: #3498db;
                color: white;
                padding: 15px;
                border-radius: 8px;
                text-align: center;
            }
            .stat-value {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 5px;
            }
            .stat-label {
                font-size: 11px;
                opacity: 0.9;
            }
            .table-container {
                margin-top: 20px;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 15px;
                font-size: 10px;
            }
            .border {
                border: 1px solid #dee2e6;
                padding: 8px;
                text-align: left;
                vertical-align: top;
            }
            th {
                background: #2c3e50;
                color: white;
                font-weight: bold;
                text-align: center;
            }
            .text-center {
                text-align: center;
            }
            .status-planeada {
                background: #ffeaa7 !important;
                color: #2d3436 !important;
            }
            .status-enprogreso {
                background: #74b9ff !important;
                color: white !important;
            }
            .status-completada {
                background: #00b894 !important;
                color: white !important;
            }
            .footer {
                margin-top: 30px;
                text-align: center;
                font-size: 10px;
                color: #7f8c8d;
                border-top: 1px solid #dee2e6;
                padding-top: 15px;
            }
            .no-data {
                text-align: center;
                padding: 40px;
                color: #6c757d;
                font-style: italic;
            }
            @media print {
                body { margin: 0; }
                .header { page-break-after: avoid; }
                table { page-break-inside: avoid; }
                tr { page-break-inside: avoid; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>📊 Reporte de Actividades</h1>
            <p class="subtitle">Sistema de Gestión de Convenios - Universidad</p>
        </div>

        <div class="meta-info">
            <strong>📅 Período de Reporte:</strong> ${new Date(meta.fechaInicio).toLocaleDateString('es-ES')} - ${new Date(meta.fechaFin).toLocaleDateString('es-ES')}<br>
            <strong>📈 Total de Registros:</strong> ${meta.totalRegistros}<br>
            <strong>🕒 Fecha de Generación:</strong> ${new Date(meta.fechaGeneracion).toLocaleString('es-ES')}<br>
            <strong>👤 Generado por:</strong> ${meta.usuarioGenerador || 'Sistema'}
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${resumen.totales.actividades}</div>
                <div class="stat-label">Total Actividades</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${resumen.totales.conveniosInvolucrados}</div>
                <div class="stat-label">Convenios Involucrados</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${resumen.totales.totalParticipantes}</div>
                <div class="stat-label">Total Participantes</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${resumen.totales.totalProductos}</div>
                <div class="stat-label">Total Productos</div>
            </div>
        </div>

        <div class="table-container">
            <h3>📋 Detalle de Actividades</h3>
            ${actividades.length === 0 ? 
                '<div class="no-data">No se encontraron actividades en el período seleccionado</div>' :
                `<table>
                    <thead>
                        <tr>
                            <th class="border">ID</th>
                            <th class="border">Nombre</th>
                            <th class="border">Descripción</th>
                            <th class="border">Convenio</th>
                            <th class="border">Fecha Inicio</th>
                            <th class="border">Fecha Fin</th>
                            <th class="border">Estado</th>
                            <th class="border">Participantes</th>
                            <th class="border">Productos</th>
                            <th class="border">Responsable</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${activitiesHTML}
                    </tbody>
                </table>`
            }
        </div>

        <div class="footer">
            <p>📄 Documento generado automáticamente por el Sistema de Gestión de Convenios</p>
            <p>🏛️ Corporación Universitaria Adventista - ${new Date().getFullYear()}</p>
        </div>
    </body>
    </html>
  `;
}

/**
 * Generar PDF del reporte de actividades
 * @param {Object} reportData - Datos del reporte
 * @param {Object} options - Opciones adicionales para el PDF
 * @returns {Buffer} Buffer del PDF generado
 */
export async function generateReportPDF(reportData, options = {}) {
  let browser;
  
  try {
    // Configurar opciones del PDF
    const defaultOptions = {
      format: 'A4',
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      printBackground: true,
      preferCSSPageSize: true
    };

    const pdfOptions = { ...defaultOptions, ...options };

    // Generar HTML del reporte
    const htmlContent = generateReportHTML(reportData);

    // Crear instancia de navegador
    browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Configurar contenido HTML
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    // Generar PDF
    const pdfBuffer = await page.pdf(pdfOptions);

    return pdfBuffer;

  } catch (error) {
    console.error('Error generando PDF:', error);
    throw new Error(`Error al generar PDF: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};