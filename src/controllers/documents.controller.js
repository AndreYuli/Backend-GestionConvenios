/**
 * @fileoverview Controlador de Gestión de Documentos
 * @description Maneja la subida, listado, descarga y eliminación de documentos de convenios
 * @author Sistema de Gestión de Convenios
 * @version 1.0.0
 */

import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { cleanupFile } from '../middleware/file-upload.middleware.js';

const prisma = new PrismaClient();

/**
 * Subir documento a un convenio
 * Complejidad: O(1) - Inserción directa
 */
const uploadDocument = async (req, res) => {
  const requestId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`📎 [UPLOAD_START] RequestID: ${requestId} - ConvenioID: ${req.convenioId}`);
    
    const { convenioId } = req;
    const { description } = req.body;
    const { fileMetadata } = req;
    const userId = req.user?.id; // Asumiendo que viene del middleware de auth

    if (!userId) {
      // Limpiar archivo si no hay usuario autenticado
      if (fileMetadata?.filePath) {
        cleanupFile(fileMetadata.filePath);
      }
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    // Verificar que el convenio existe
    const convenio = await prisma.convenio.findUnique({
      where: { id: convenioId },
      select: { id: true, nombre: true }
    });

    if (!convenio) {
      // Limpiar archivo si el convenio no existe
      if (fileMetadata?.filePath) {
        cleanupFile(fileMetadata.filePath);
      }
      return res.status(404).json({
        success: false,
        error: 'Convenio no encontrado'
      });
    }

    // Verificar límite de documentos por convenio
    const documentCount = await prisma.document.count({
      where: { convenioId }
    });

    const maxDocuments = parseInt(process.env.DOCUMENTS_PER_CONVENIO_LIMIT) || 20;
    if (documentCount >= maxDocuments) {
      // Limpiar archivo si se excede el límite
      if (fileMetadata?.filePath) {
        cleanupFile(fileMetadata.filePath);
      }
      return res.status(400).json({
        success: false,
        error: `Límite de documentos excedido. Máximo permitido: ${maxDocuments}`
      });
    }

    // Crear registro en la base de datos
    const document = await prisma.document.create({
      data: {
        convenioId,
        fileName: fileMetadata.originalName,
        fileNameDisk: fileMetadata.fileName,
        filePath: fileMetadata.filePath,
        fileSize: fileMetadata.fileSize,
        mimeType: fileMetadata.mimeType,
        uploadedBy: userId,
        description: description || null
      },
      include: {
        uploader: {
          select: {
            id: true,
            email: true
          }
        },
        convenio: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });

    console.log(`✅ [UPLOAD_SUCCESS] RequestID: ${requestId} - DocumentID: ${document.id} - File: ${fileMetadata.originalName}`);

    res.status(201).json({
      success: true,
      message: 'Documento subido exitosamente',
      data: {
        document: {
          id: document.id,
          fileName: document.fileName,
          fileSize: document.fileSize,
          mimeType: document.mimeType,
          description: document.description,
          uploadedAt: document.createdAt,
          uploader: document.uploader,
          convenio: document.convenio
        }
      }
    });

  } catch (error) {
    console.error(`❌ [UPLOAD_ERROR] RequestID: ${requestId} - Error:`, error);
    
    // Limpiar archivo en caso de error
    if (req.fileMetadata?.filePath) {
      cleanupFile(req.fileMetadata.filePath);
    }

    res.status(500).json({
      success: false,
      error: 'Error interno al subir el documento',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Listar documentos de un convenio
 * Complejidad: O(n) donde n es el número de documentos del convenio
 */
const getDocumentsByConvenio = async (req, res) => {
  try {
    const { convenioId } = req;
    const { page = 1, limit = 10 } = req.query;

    // Verificar que el convenio existe
    const convenio = await prisma.convenio.findUnique({
      where: { id: convenioId },
      select: { id: true, nombre: true }
    });

    if (!convenio) {
      return res.status(404).json({
        success: false,
        error: 'Convenio no encontrado'
      });
    }

    // Calcular paginación
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit))); // Máximo 50 documentos por página
    const skip = (pageNum - 1) * limitNum;

    // Obtener documentos con paginación
    const [documents, totalCount] = await Promise.all([
      prisma.document.findMany({
        where: { convenioId },
        include: {
          uploader: {
            select: {
              id: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.document.count({
        where: { convenioId }
      })
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      data: {
        documents: documents.map(doc => ({
          id: doc.id,
          fileName: doc.fileName,
          fileSize: doc.fileSize,
          mimeType: doc.mimeType,
          description: doc.description,
          uploadedAt: doc.createdAt,
          uploader: doc.uploader
        })),
        convenio,
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
    console.error('❌ Error al obtener documentos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno al obtener documentos'
    });
  }
};

/**
 * Descargar documento
 * Complejidad: O(1) - Búsqueda por ID con índice
 */
const downloadDocument = async (req, res) => {
  try {
    const { convenioId, documentId } = req.params;

    const document = await prisma.document.findFirst({
      where: {
        id: parseInt(documentId),
        convenioId: parseInt(convenioId)
      },
      select: {
        id: true,
        fileName: true,
        filePath: true,
        mimeType: true,
        fileSize: true
      }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Documento no encontrado'
      });
    }

    // Verificar que el archivo existe en el sistema de archivos
    if (!fs.existsSync(document.filePath)) {
      console.error(`❌ Archivo no encontrado en el sistema: ${document.filePath}`);
      return res.status(404).json({
        success: false,
        error: 'Archivo no encontrado en el servidor'
      });
    }

    // Configurar headers para la descarga
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Length', document.fileSize);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.fileName)}"`);

    // Transmitir el archivo
    const fileStream = fs.createReadStream(document.filePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('❌ Error al transmitir archivo:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Error al transmitir el archivo'
        });
      }
    });

    console.log(`📥 [DOWNLOAD] DocumentID: ${document.id} - File: ${document.fileName}`);

  } catch (error) {
    console.error('❌ Error en descarga de documento:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Error interno al descargar documento'
      });
    }
  }
};

/**
 * Eliminar documento
 * Complejidad: O(1) - Eliminación directa
 */
const deleteDocument = async (req, res) => {
  try {
    const { convenioId, documentId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    const document = await prisma.document.findFirst({
      where: {
        id: parseInt(documentId),
        convenioId: parseInt(convenioId)
      },
      select: {
        id: true,
        fileName: true,
        filePath: true,
        uploadedBy: true
      }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Documento no encontrado'
      });
    }

    // Verificar permisos: solo el usuario que subió el archivo o un admin puede eliminarlo
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { rol: true }
    });

    if (document.uploadedBy !== userId && user?.rol !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para eliminar este documento'
      });
    }

    // Eliminar registro de la base de datos
    await prisma.document.delete({
      where: { id: document.id }
    });

    // Eliminar archivo del sistema de archivos
    cleanupFile(document.filePath);

    console.log(`🗑️ [DELETE] DocumentID: ${document.id} - File: ${document.fileName} - DeletedBy: ${userId}`);

    res.json({
      success: true,
      message: 'Documento eliminado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error al eliminar documento:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno al eliminar documento'
    });
  }
};

/**
 * Obtener información de un documento específico
 * Complejidad: O(1) - Búsqueda por ID con índice
 */
const getDocumentInfo = async (req, res) => {
  try {
    const { convenioId, documentId } = req.params;

    const document = await prisma.document.findFirst({
      where: {
        id: parseInt(documentId),
        convenioId: parseInt(convenioId)
      },
      include: {
        uploader: {
          select: {
            id: true,
            email: true
          }
        },
        convenio: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Documento no encontrado'
      });
    }

    res.json({
      success: true,
      data: {
        document: {
          id: document.id,
          fileName: document.fileName,
          fileSize: document.fileSize,
          mimeType: document.mimeType,
          description: document.description,
          uploadedAt: document.createdAt,
          updatedAt: document.updatedAt,
          uploader: document.uploader,
          convenio: document.convenio
        }
      }
    });

  } catch (error) {
    console.error('❌ Error al obtener información del documento:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno al obtener información del documento'
    });
  }
};

export {
  uploadDocument,
  getDocumentsByConvenio,
  downloadDocument,
  deleteDocument,
  getDocumentInfo
};