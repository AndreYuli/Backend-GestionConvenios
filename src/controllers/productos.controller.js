import { prisma } from '../lib/prisma.js';

/**
 * Tipos de producto válidos según el modelo de datos
 */
export const TIPOS_PRODUCTO = [
  'Articulo',
  'Software', 
  'Patente',
  'Informe',
  'Manual',
  'Prototipo',
  'Dataset',
  'Otro'
];

/**
 * Agregar un nuevo producto a una actividad
 */
export const addProducto = async (req, res) => {
  try {
    const { actividadId } = req.params;
    const { nombre, tipo, descripcion, enlace, archivoUrl } = req.body;

    // Validar datos requeridos
    if (!nombre || !tipo || !descripcion) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, tipo y descripción son requeridos',
        error: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Validar tipo de producto
    if (!TIPOS_PRODUCTO.includes(tipo)) {
      return res.status(400).json({
        success: false,
        message: `Tipo de producto inválido. Tipos válidos: ${TIPOS_PRODUCTO.join(', ')}`,
        error: 'INVALID_PRODUCT_TYPE',
        validTypes: TIPOS_PRODUCTO
      });
    }

    // Verificar que la actividad existe
    const actividad = await prisma.actividad.findUnique({
      where: { id: parseInt(actividadId) },
      include: {
        convenio: true,
        responsable: true
      }
    });

    if (!actividad) {
      return res.status(404).json({
        success: false,
        message: 'Actividad no encontrada',
        error: 'ACTIVITY_NOT_FOUND'
      });
    }

    // Verificar que el usuario tiene permisos para agregar productos
    // Solo el responsable de la actividad o usuarios ADMIN/GESTOR pueden agregar productos
    const isResponsable = actividad.responsableId === req.user.id;
    const hasPermission = req.user.rol === 'ADMIN' || req.user.rol === 'GESTOR' || isResponsable;

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para agregar productos a esta actividad',
        error: 'INSUFFICIENT_PERMISSIONS',
        details: 'Solo el responsable de la actividad o usuarios con rol ADMIN/GESTOR pueden agregar productos'
      });
    }

    // Crear el producto
    const nuevoProducto = await prisma.producto.create({
      data: {
        actividadId: parseInt(actividadId),
        nombre,
        tipo,
        descripcion,
        enlace: enlace || null,
        archivoUrl: archivoUrl || null
      },
      include: {
        actividad: {
          select: {
            id: true,
            nombre: true,
            estado: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Producto agregado exitosamente',
      data: nuevoProducto
    });

  } catch (error) {
    console.error('Error al agregar producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al agregar producto',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * Obtener todos los productos de una actividad
 */
export const getProductosByActividad = async (req, res) => {
  try {
    const { actividadId } = req.params;

    // Verificar que la actividad existe
    const actividad = await prisma.actividad.findUnique({
      where: { id: parseInt(actividadId) }
    });

    if (!actividad) {
      return res.status(404).json({
        success: false,
        message: 'Actividad no encontrada',
        error: 'ACTIVITY_NOT_FOUND'
      });
    }

    // Obtener productos de la actividad
    const productos = await prisma.producto.findMany({
      where: {
        actividadId: parseInt(actividadId)
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        actividad: {
          select: {
            id: true,
            nombre: true,
            estado: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Productos obtenidos exitosamente',
      data: productos,
      meta: {
        total: productos.length,
        actividadId: parseInt(actividadId)
      }
    });

  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener productos',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * Obtener un producto específico
 */
export const getProductoById = async (req, res) => {
  try {
    const { actividadId, productoId } = req.params;

    const producto = await prisma.producto.findFirst({
      where: {
        id: parseInt(productoId),
        actividadId: parseInt(actividadId)
      },
      include: {
        actividad: {
          include: {
            convenio: {
              select: {
                id: true,
                titulo: true
              }
            },
            responsable: {
              select: {
                id: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado en esta actividad',
        error: 'PRODUCT_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      message: 'Producto obtenido exitosamente',
      data: producto
    });

  } catch (error) {
    console.error('Error al obtener producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener producto',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * Actualizar un producto
 */
export const updateProducto = async (req, res) => {
  try {
    const { actividadId, productoId } = req.params;
    const { nombre, tipo, descripcion, enlace, archivoUrl } = req.body;

    // Verificar que el producto existe y pertenece a la actividad
    const productoExistente = await prisma.producto.findFirst({
      where: {
        id: parseInt(productoId),
        actividadId: parseInt(actividadId)
      },
      include: {
        actividad: {
          select: {
            responsableId: true
          }
        }
      }
    });

    if (!productoExistente) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado en esta actividad',
        error: 'PRODUCT_NOT_FOUND'
      });
    }

    // Verificar permisos
    const isResponsable = productoExistente.actividad.responsableId === req.user.id;
    const hasPermission = req.user.rol === 'ADMIN' || req.user.rol === 'GESTOR' || isResponsable;

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para actualizar este producto',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // Validar tipo de producto si se proporciona
    if (tipo && !TIPOS_PRODUCTO.includes(tipo)) {
      return res.status(400).json({
        success: false,
        message: `Tipo de producto inválido. Tipos válidos: ${TIPOS_PRODUCTO.join(', ')}`,
        error: 'INVALID_PRODUCT_TYPE',
        validTypes: TIPOS_PRODUCTO
      });
    }

    // Preparar datos para actualización (solo campos proporcionados)
    const datosActualizacion = {};
    if (nombre !== undefined) datosActualizacion.nombre = nombre;
    if (tipo !== undefined) datosActualizacion.tipo = tipo;
    if (descripcion !== undefined) datosActualizacion.descripcion = descripcion;
    if (enlace !== undefined) datosActualizacion.enlace = enlace;
    if (archivoUrl !== undefined) datosActualizacion.archivoUrl = archivoUrl;

    // Actualizar producto
    const productoActualizado = await prisma.producto.update({
      where: {
        id: parseInt(productoId)
      },
      data: datosActualizacion,
      include: {
        actividad: {
          select: {
            id: true,
            nombre: true,
            estado: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Producto actualizado exitosamente',
      data: productoActualizado
    });

  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al actualizar producto',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * Eliminar un producto
 */
export const deleteProducto = async (req, res) => {
  try {
    const { actividadId, productoId } = req.params;

    // Verificar que el producto existe y pertenece a la actividad
    const productoExistente = await prisma.producto.findFirst({
      where: {
        id: parseInt(productoId),
        actividadId: parseInt(actividadId)
      },
      include: {
        actividad: {
          select: {
            responsableId: true
          }
        }
      }
    });

    if (!productoExistente) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado en esta actividad',
        error: 'PRODUCT_NOT_FOUND'
      });
    }

    // Verificar permisos
    const isResponsable = productoExistente.actividad.responsableId === req.user.id;
    const hasPermission = req.user.rol === 'ADMIN' || req.user.rol === 'GESTOR' || isResponsable;

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para eliminar este producto',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // Eliminar producto
    await prisma.producto.delete({
      where: {
        id: parseInt(productoId)
      }
    });

    res.json({
      success: true,
      message: 'Producto eliminado exitosamente',
      data: {
        id: parseInt(productoId),
        actividadId: parseInt(actividadId),
        deletedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al eliminar producto',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * Obtener tipos de producto disponibles
 */
export const getTiposProducto = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Tipos de producto obtenidos exitosamente',
      data: TIPOS_PRODUCTO.map(tipo => ({
        valor: tipo,
        etiqueta: tipo.replace(/([A-Z])/g, ' $1').trim() // Convierte "TipoProducto" a "Tipo Producto"
      }))
    });
  } catch (error) {
    console.error('Error al obtener tipos de producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
};