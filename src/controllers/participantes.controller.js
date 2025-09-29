/**
 * @fileoverview Controlador de Gestión de Participantes
 * @description Maneja la creación, listado, actualización y eliminación de participantes en actividades
 * @author Sistema de Gestión de Convenios
 * @version 1.0.0
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Roles predefinidos para participantes
 */
const ROLES_PERMITIDOS = [
  'Estudiante',
  'Docente',
  'Docente Investigador',
  'Investigador',
  'Coordinador',
  'Externo',
  'Colaborador'
];

/**
 * Agregar participante a una actividad
 * Complejidad: O(1) - Inserción directa
 */
const addParticipante = async (req, res) => {
  const requestId = `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`👥 [ADD_PARTICIPANT_START] RequestID: ${requestId} - ActividadID: ${req.params.actividadId}`);
    
    const { actividadId } = req.params;
    const { nombreCompleto, correoElectronico, rol } = req.body;

    // Validaciones básicas
    if (!nombreCompleto || !correoElectronico || !rol) {
      return res.status(400).json({
        success: false,
        error: 'Nombre completo, correo electrónico y rol son requeridos'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correoElectronico)) {
      return res.status(400).json({
        success: false,
        error: 'Formato de correo electrónico inválido'
      });
    }

    // Validar rol permitido
    if (!ROLES_PERMITIDOS.includes(rol)) {
      return res.status(400).json({
        success: false,
        error: `Rol no válido. Roles permitidos: ${ROLES_PERMITIDOS.join(', ')}`
      });
    }

    // Verificar que la actividad existe
    const actividad = await prisma.actividad.findUnique({
      where: { id: parseInt(actividadId) },
      select: { 
        id: true, 
        nombre: true,
        convenio: {
          select: {
            id: true,
            nombre: true
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

    // Verificar que el participante no esté ya registrado en la actividad
    const participanteExistente = await prisma.participante.findFirst({
      where: {
        actividadId: parseInt(actividadId),
        correoElectronico: correoElectronico.toLowerCase().trim()
      }
    });

    if (participanteExistente) {
      return res.status(409).json({
        success: false,
        error: 'El participante ya está registrado en esta actividad'
      });
    }

    // Crear participante
    const participante = await prisma.participante.create({
      data: {
        actividadId: parseInt(actividadId),
        nombreCompleto: nombreCompleto.trim(),
        correoElectronico: correoElectronico.toLowerCase().trim(),
        rol: rol
      },
      include: {
        actividad: {
          select: {
            id: true,
            nombre: true,
            convenio: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        }
      }
    });

    console.log(`✅ [ADD_PARTICIPANT_SUCCESS] RequestID: ${requestId} - ParticipanteID: ${participante.id} - Email: ${participante.correoElectronico}`);

    res.status(201).json({
      success: true,
      message: 'Participante agregado exitosamente',
      data: {
        participante: {
          id: participante.id,
          nombreCompleto: participante.nombreCompleto,
          correoElectronico: participante.correoElectronico,
          rol: participante.rol,
          fechaRegistro: participante.createdAt,
          actividad: participante.actividad
        }
      }
    });

  } catch (error) {
    console.error(`❌ [ADD_PARTICIPANT_ERROR] RequestID: ${requestId} - Error:`, error);
    
    res.status(500).json({
      success: false,
      error: 'Error interno al agregar participante',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Listar participantes de una actividad
 * Complejidad: O(n) donde n es el número de participantes de la actividad
 */
const getParticipantesByActividad = async (req, res) => {
  try {
    const { actividadId } = req.params;
    const { page = 1, limit = 20, rol } = req.query;

    // Verificar que la actividad existe
    const actividad = await prisma.actividad.findUnique({
      where: { id: parseInt(actividadId) },
      select: { 
        id: true, 
        nombre: true,
        descripcion: true,
        convenio: {
          select: {
            id: true,
            nombre: true
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

    // Construir filtros
    const whereClause = {
      actividadId: parseInt(actividadId)
    };

    if (rol && ROLES_PERMITIDOS.includes(rol)) {
      whereClause.rol = rol;
    }

    // Calcular paginación
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit))); // Máximo 50 participantes por página
    const skip = (pageNum - 1) * limitNum;

    // Obtener participantes con paginación
    const [participantes, totalCount] = await Promise.all([
      prisma.participante.findMany({
        where: whereClause,
        orderBy: [
          { rol: 'asc' },
          { nombreCompleto: 'asc' }
        ],
        skip,
        take: limitNum
      }),
      prisma.participante.count({
        where: whereClause
      })
    ]);

    // Agrupar por rol para estadísticas
    const participantesPorRol = await prisma.participante.groupBy({
      by: ['rol'],
      where: { actividadId: parseInt(actividadId) },
      _count: {
        id: true
      }
    });

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      data: {
        participantes: participantes.map(p => ({
          id: p.id,
          nombreCompleto: p.nombreCompleto,
          correoElectronico: p.correoElectronico,
          rol: p.rol,
          fechaRegistro: p.createdAt,
          ultimaActualizacion: p.updatedAt
        })),
        actividad,
        estadisticas: {
          totalParticipantes: totalCount,
          participantesPorRol: participantesPorRol.reduce((acc, item) => {
            acc[item.rol] = item._count.id;
            return acc;
          }, {}),
          rolesDisponibles: ROLES_PERMITIDOS
        },
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
    console.error('❌ Error al obtener participantes:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno al obtener participantes'
    });
  }
};

/**
 * Obtener información de un participante específico
 * Complejidad: O(1) - Búsqueda por ID con índice
 */
const getParticipanteById = async (req, res) => {
  try {
    const { actividadId, participanteId } = req.params;

    const participante = await prisma.participante.findFirst({
      where: {
        id: parseInt(participanteId),
        actividadId: parseInt(actividadId)
      },
      include: {
        actividad: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
            convenio: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        }
      }
    });

    if (!participante) {
      return res.status(404).json({
        success: false,
        error: 'Participante no encontrado'
      });
    }

    res.json({
      success: true,
      data: {
        participante: {
          id: participante.id,
          nombreCompleto: participante.nombreCompleto,
          correoElectronico: participante.correoElectronico,
          rol: participante.rol,
          fechaRegistro: participante.createdAt,
          ultimaActualizacion: participante.updatedAt,
          actividad: participante.actividad
        }
      }
    });

  } catch (error) {
    console.error('❌ Error al obtener participante:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno al obtener participante'
    });
  }
};

/**
 * Actualizar información de un participante
 * Complejidad: O(1) - Actualización directa
 */
const updateParticipante = async (req, res) => {
  try {
    const { actividadId, participanteId } = req.params;
    const { nombreCompleto, correoElectronico, rol } = req.body;

    // Validar que el participante existe
    const participanteExistente = await prisma.participante.findFirst({
      where: {
        id: parseInt(participanteId),
        actividadId: parseInt(actividadId)
      }
    });

    if (!participanteExistente) {
      return res.status(404).json({
        success: false,
        error: 'Participante no encontrado'
      });
    }

    // Construir datos de actualización
    const updateData = {};

    if (nombreCompleto) {
      updateData.nombreCompleto = nombreCompleto.trim();
    }

    if (correoElectronico) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(correoElectronico)) {
        return res.status(400).json({
          success: false,
          error: 'Formato de correo electrónico inválido'
        });
      }

      // Verificar que el nuevo email no esté ya usado por otro participante en la misma actividad
      const emailExistente = await prisma.participante.findFirst({
        where: {
          actividadId: parseInt(actividadId),
          correoElectronico: correoElectronico.toLowerCase().trim(),
          id: { not: parseInt(participanteId) }
        }
      });

      if (emailExistente) {
        return res.status(409).json({
          success: false,
          error: 'Ya existe otro participante con ese correo electrónico en esta actividad'
        });
      }

      updateData.correoElectronico = correoElectronico.toLowerCase().trim();
    }

    if (rol) {
      if (!ROLES_PERMITIDOS.includes(rol)) {
        return res.status(400).json({
          success: false,
          error: `Rol no válido. Roles permitidos: ${ROLES_PERMITIDOS.join(', ')}`
        });
      }
      updateData.rol = rol;
    }

    // Si no hay datos para actualizar
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionaron datos para actualizar'
      });
    }

    // Actualizar participante
    const participanteActualizado = await prisma.participante.update({
      where: { id: parseInt(participanteId) },
      data: updateData,
      include: {
        actividad: {
          select: {
            id: true,
            nombre: true,
            convenio: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        }
      }
    });

    console.log(`📝 [UPDATE_PARTICIPANT] ParticipanteID: ${participanteId} - Updated fields: ${Object.keys(updateData).join(', ')}`);

    res.json({
      success: true,
      message: 'Participante actualizado exitosamente',
      data: {
        participante: {
          id: participanteActualizado.id,
          nombreCompleto: participanteActualizado.nombreCompleto,
          correoElectronico: participanteActualizado.correoElectronico,
          rol: participanteActualizado.rol,
          fechaRegistro: participanteActualizado.createdAt,
          ultimaActualizacion: participanteActualizado.updatedAt,
          actividad: participanteActualizado.actividad
        }
      }
    });

  } catch (error) {
    console.error('❌ Error al actualizar participante:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno al actualizar participante'
    });
  }
};

/**
 * Eliminar participante de una actividad
 * Complejidad: O(1) - Eliminación directa
 */
const deleteParticipante = async (req, res) => {
  try {
    const { actividadId, participanteId } = req.params;

    const participante = await prisma.participante.findFirst({
      where: {
        id: parseInt(participanteId),
        actividadId: parseInt(actividadId)
      },
      select: {
        id: true,
        nombreCompleto: true,
        correoElectronico: true,
        rol: true
      }
    });

    if (!participante) {
      return res.status(404).json({
        success: false,
        error: 'Participante no encontrado'
      });
    }

    // Eliminar participante
    await prisma.participante.delete({
      where: { id: parseInt(participanteId) }
    });

    console.log(`🗑️ [DELETE_PARTICIPANT] ParticipanteID: ${participanteId} - ${participante.nombreCompleto} (${participante.correoElectronico})`);

    res.json({
      success: true,
      message: 'Participante eliminado exitosamente',
      data: {
        eliminado: {
          id: participante.id,
          nombreCompleto: participante.nombreCompleto,
          correoElectronico: participante.correoElectronico,
          rol: participante.rol
        }
      }
    });

  } catch (error) {
    console.error('❌ Error al eliminar participante:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno al eliminar participante'
    });
  }
};

/**
 * Obtener roles disponibles
 * Complejidad: O(1) - Retorno de constante
 */
const getRolesDisponibles = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        roles: ROLES_PERMITIDOS,
        total: ROLES_PERMITIDOS.length
      }
    });
  } catch (error) {
    console.error('❌ Error al obtener roles:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno al obtener roles'
    });
  }
};

export {
  addParticipante,
  getParticipantesByActividad,
  getParticipanteById,
  updateParticipante,
  deleteParticipante,
  getRolesDisponibles,
  ROLES_PERMITIDOS
};