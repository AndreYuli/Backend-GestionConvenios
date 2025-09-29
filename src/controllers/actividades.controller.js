/**
 * @fileoverview Controlador de Gestión de Actividades
 * @description Maneja CRUD completo de actividades vinculadas a convenios
 * @author Sistema de Gestión de Convenios
 * @version 1.0.0
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Crear nueva actividad
 * Complejidad: O(1) - Inserción directa
 */
const createActividad = async (req, res) => {
  const requestId = `create_activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`📋 [ACTIVITY_CREATE_START] RequestID: ${requestId}`);
    
    const { convenioId } = req.params;
    const { nombre, descripcion, responsableId, fechaInicio, fechaFin } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    // Validaciones de entrada
    if (!nombre || !descripcion || !responsableId || !fechaInicio || !fechaFin) {
      return res.status(400).json({
        success: false,
        error: 'Todos los campos son obligatorios: nombre, descripción, responsableId, fechaInicio, fechaFin'
      });
    }

    // Validar fechas
    const fechaInicioDate = new Date(fechaInicio);
    const fechaFinDate = new Date(fechaFin);
    
    if (fechaInicioDate >= fechaFinDate) {
      return res.status(400).json({
        success: false,
        error: 'La fecha de inicio debe ser anterior a la fecha de fin'
      });
    }

    // Verificar que el convenio existe
    const convenio = await prisma.convenio.findUnique({
      where: { id: parseInt(convenioId) },
      select: { id: true, nombre: true, fechaInicio: true, fechaFin: true }
    });

    if (!convenio) {
      return res.status(404).json({
        success: false,
        error: 'Convenio no encontrado'
      });
    }

    // Validar que las fechas estén dentro del período del convenio
    if (fechaInicioDate < convenio.fechaInicio || fechaFinDate > convenio.fechaFin) {
      return res.status(400).json({
        success: false,
        error: 'Las fechas de la actividad deben estar dentro del período del convenio'
      });
    }

    // Verificar que el responsable existe y está activo
    const responsable = await prisma.user.findUnique({
      where: { id: parseInt(responsableId) },
      select: { id: true, email: true, isActive: true, rol: true }
    });

    if (!responsable) {
      return res.status(404).json({
        success: false,
        error: 'Usuario responsable no encontrado'
      });
    }

    if (!responsable.isActive) {
      return res.status(400).json({
        success: false,
        error: 'El usuario responsable no está activo'
      });
    }

    // Crear la actividad
    const actividad = await prisma.actividad.create({
      data: {
        convenioId: parseInt(convenioId),
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        responsableId: parseInt(responsableId),
        fechaInicio: fechaInicioDate,
        fechaFin: fechaFinDate,
        estado: 'Planeada' // Estado inicial según los criterios de aceptación
      },
      include: {
        convenio: {
          select: {
            id: true,
            nombre: true
          }
        },
        responsable: {
          select: {
            id: true,
            email: true,
            rol: true
          }
        }
      }
    });

    console.log(`✅ [ACTIVITY_CREATE_SUCCESS] RequestID: ${requestId} - ActivityID: ${actividad.id} - Name: ${nombre}`);

    res.status(201).json({
      success: true,
      message: 'Actividad creada exitosamente',
      data: {
        actividad: {
          id: actividad.id,
          nombre: actividad.nombre,
          descripcion: actividad.descripcion,
          fechaInicio: actividad.fechaInicio,
          fechaFin: actividad.fechaFin,
          estado: actividad.estado,
          createdAt: actividad.createdAt,
          convenio: actividad.convenio,
          responsable: actividad.responsable
        }
      }
    });

  } catch (error) {
    console.error(`❌ [ACTIVITY_CREATE_ERROR] RequestID: ${requestId} - Error:`, error);
    
    res.status(500).json({
      success: false,
      error: 'Error interno al crear la actividad',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obtener actividades de un convenio
 * Complejidad: O(n) donde n es el número de actividades del convenio
 */
const getActividadesByConvenio = async (req, res) => {
  try {
    const { convenioId } = req.params;
    const { page = 1, limit = 10, estado, responsableId } = req.query;

    // Verificar que el convenio existe
    const convenio = await prisma.convenio.findUnique({
      where: { id: parseInt(convenioId) },
      select: { id: true, nombre: true }
    });

    if (!convenio) {
      return res.status(404).json({
        success: false,
        error: 'Convenio no encontrado'
      });
    }

    // Construir filtros
    const where = {
      convenioId: parseInt(convenioId)
    };

    if (estado) {
      where.estado = estado;
    }

    if (responsableId) {
      where.responsableId = parseInt(responsableId);
    }

    // Calcular paginación
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Obtener actividades con paginación
    const [actividades, totalCount] = await Promise.all([
      prisma.actividad.findMany({
        where,
        include: {
          responsable: {
            select: {
              id: true,
              email: true,
              rol: true
            }
          }
        },
        orderBy: { fechaInicio: 'asc' },
        skip,
        take: limitNum
      }),
      prisma.actividad.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      data: {
        actividades: actividades.map(act => ({
          id: act.id,
          nombre: act.nombre,
          descripcion: act.descripcion,
          fechaInicio: act.fechaInicio,
          fechaFin: act.fechaFin,
          estado: act.estado,
          createdAt: act.createdAt,
          responsable: act.responsable
        })),
        convenio,
        filtros: { estado, responsableId },
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      }
    });

  } catch (error) {
    console.error('❌ Error al obtener actividades:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno al obtener actividades'
    });
  }
};

/**
 * Obtener actividad específica
 * Complejidad: O(1) - Búsqueda por ID con índice
 */
const getActividad = async (req, res) => {
  try {
    const { convenioId, actividadId } = req.params;

    const actividad = await prisma.actividad.findFirst({
      where: {
        id: parseInt(actividadId),
        convenioId: parseInt(convenioId)
      },
      include: {
        convenio: {
          select: {
            id: true,
            nombre: true,
            fechaInicio: true,
            fechaFin: true
          }
        },
        responsable: {
          select: {
            id: true,
            email: true,
            rol: true
          }
        }
      }
    });

    if (!actividad) {
      return res.status(404).json({
        success: false,
        error: 'Actividad no encontrada'
      });
    }

    res.json({
      success: true,
      data: {
        actividad: {
          id: actividad.id,
          nombre: actividad.nombre,
          descripcion: actividad.descripcion,
          fechaInicio: actividad.fechaInicio,
          fechaFin: actividad.fechaFin,
          estado: actividad.estado,
          createdAt: actividad.createdAt,
          updatedAt: actividad.updatedAt,
          convenio: actividad.convenio,
          responsable: actividad.responsable
        }
      }
    });

  } catch (error) {
    console.error('❌ Error al obtener actividad:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno al obtener actividad'
    });
  }
};

/**
 * Actualizar actividad
 * Complejidad: O(1) - Actualización directa
 */
const updateActividad = async (req, res) => {
  try {
    const { convenioId, actividadId } = req.params;
    const { nombre, descripcion, responsableId, fechaInicio, fechaFin, estado } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    // Verificar que la actividad existe
    const actividadExistente = await prisma.actividad.findFirst({
      where: {
        id: parseInt(actividadId),
        convenioId: parseInt(convenioId)
      },
      include: {
        convenio: true
      }
    });

    if (!actividadExistente) {
      return res.status(404).json({
        success: false,
        error: 'Actividad no encontrada'
      });
    }

    // Preparar datos para actualizar
    const updateData = {};

    if (nombre) updateData.nombre = nombre.trim();
    if (descripcion) updateData.descripcion = descripcion.trim();
    if (responsableId) {
      // Verificar que el nuevo responsable existe
      const responsable = await prisma.user.findUnique({
        where: { id: parseInt(responsableId) },
        select: { id: true, isActive: true }
      });

      if (!responsable || !responsable.isActive) {
        return res.status(400).json({
          success: false,
          error: 'Responsable no válido o inactivo'
        });
      }

      updateData.responsableId = parseInt(responsableId);
    }

    if (fechaInicio) updateData.fechaInicio = new Date(fechaInicio);
    if (fechaFin) updateData.fechaFin = new Date(fechaFin);
    if (estado) {
      const estadosValidos = ['Planeada', 'EnProgreso', 'Completada'];
      if (!estadosValidos.includes(estado)) {
        return res.status(400).json({
          success: false,
          error: 'Estado no válido. Debe ser: Planeada, EnProgreso o Completada'
        });
      }
      updateData.estado = estado;
    }

    // Validar fechas si se proporcionan
    if (updateData.fechaInicio || updateData.fechaFin) {
      const fechaInicioFinal = updateData.fechaInicio || actividadExistente.fechaInicio;
      const fechaFinFinal = updateData.fechaFin || actividadExistente.fechaFin;

      if (fechaInicioFinal >= fechaFinFinal) {
        return res.status(400).json({
          success: false,
          error: 'La fecha de inicio debe ser anterior a la fecha de fin'
        });
      }

      // Validar que están dentro del período del convenio
      if (fechaInicioFinal < actividadExistente.convenio.fechaInicio || 
          fechaFinFinal > actividadExistente.convenio.fechaFin) {
        return res.status(400).json({
          success: false,
          error: 'Las fechas deben estar dentro del período del convenio'
        });
      }
    }

    // Actualizar la actividad
    const actividad = await prisma.actividad.update({
      where: { id: parseInt(actividadId) },
      data: updateData,
      include: {
        convenio: {
          select: {
            id: true,
            nombre: true
          }
        },
        responsable: {
          select: {
            id: true,
            email: true,
            rol: true
          }
        }
      }
    });

    console.log(`📝 [ACTIVITY_UPDATE] ActivityID: ${actividad.id} - UpdatedBy: ${userId}`);

    res.json({
      success: true,
      message: 'Actividad actualizada exitosamente',
      data: {
        actividad: {
          id: actividad.id,
          nombre: actividad.nombre,
          descripcion: actividad.descripcion,
          fechaInicio: actividad.fechaInicio,
          fechaFin: actividad.fechaFin,
          estado: actividad.estado,
          updatedAt: actividad.updatedAt,
          convenio: actividad.convenio,
          responsable: actividad.responsable
        }
      }
    });

  } catch (error) {
    console.error('❌ Error al actualizar actividad:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno al actualizar actividad'
    });
  }
};

/**
 * Eliminar actividad
 * Complejidad: O(1) - Eliminación directa
 */
const deleteActividad = async (req, res) => {
  try {
    const { convenioId, actividadId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    // Verificar que la actividad existe
    const actividad = await prisma.actividad.findFirst({
      where: {
        id: parseInt(actividadId),
        convenioId: parseInt(convenioId)
      },
      select: {
        id: true,
        nombre: true,
        estado: true
      }
    });

    if (!actividad) {
      return res.status(404).json({
        success: false,
        error: 'Actividad no encontrada'
      });
    }

    // Verificar permisos - solo admin o gestor pueden eliminar actividades completadas
    if (actividad.estado === 'Completada') {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { rol: true }
      });

      if (user?.rol !== 'ADMIN' && user?.rol !== 'GESTOR') {
        return res.status(403).json({
          success: false,
          error: 'No tienes permisos para eliminar actividades completadas'
        });
      }
    }

    // Eliminar la actividad
    await prisma.actividad.delete({
      where: { id: parseInt(actividadId) }
    });

    console.log(`🗑️ [ACTIVITY_DELETE] ActivityID: ${actividadId} - DeletedBy: ${userId}`);

    res.json({
      success: true,
      message: 'Actividad eliminada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error al eliminar actividad:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno al eliminar actividad'
    });
  }
};

/**
 * Obtener estadísticas de actividades por convenio
 * Complejidad: O(1) - Agregaciones optimizadas
 */
const getEstadisticasActividades = async (req, res) => {
  try {
    const { convenioId } = req.params;

    // Verificar que el convenio existe
    const convenio = await prisma.convenio.findUnique({
      where: { id: parseInt(convenioId) },
      select: { id: true, nombre: true }
    });

    if (!convenio) {
      return res.status(404).json({
        success: false,
        error: 'Convenio no encontrado'
      });
    }

    // Obtener estadísticas
    const [
      totalActividades,
      actividadesPlaneadas,
      actividadesEnProgreso,
      actividadesCompletadas,
      actividadesVencidas
    ] = await Promise.all([
      prisma.actividad.count({
        where: { convenioId: parseInt(convenioId) }
      }),
      prisma.actividad.count({
        where: { convenioId: parseInt(convenioId), estado: 'Planeada' }
      }),
      prisma.actividad.count({
        where: { convenioId: parseInt(convenioId), estado: 'EnProgreso' }
      }),
      prisma.actividad.count({
        where: { convenioId: parseInt(convenioId), estado: 'Completada' }
      }),
      prisma.actividad.count({
        where: {
          convenioId: parseInt(convenioId),
          fechaFin: { lt: new Date() },
          estado: { not: 'Completada' }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        convenio,
        estadisticas: {
          total: totalActividades,
          planeadas: actividadesPlaneadas,
          enProgreso: actividadesEnProgreso,
          completadas: actividadesCompletadas,
          vencidas: actividadesVencidas,
          progreso: totalActividades > 0 ? Math.round((actividadesCompletadas / totalActividades) * 100) : 0
        }
      }
    });

  } catch (error) {
    console.error('❌ Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno al obtener estadísticas'
    });
  }
};

export {
  createActividad,
  getActividadesByConvenio,
  getActividad,
  updateActividad,
  deleteActividad,
  getEstadisticasActividades
};