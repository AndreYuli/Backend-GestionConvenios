/**
 * @fileoverview Middleware para Validación y Subida de Archivos
 * @description Implementa multer con validaciones robustas para la gestión de documentos
 * @author Sistema de Gestión de Convenios
 * @version 1.0.0
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

/**
 * Configuración de almacenamiento de archivos
 * Crea nombres únicos para evitar conflictos
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), process.env.UPLOAD_PATH || 'uploads', 'convenios');
    
    // Crear directorio si no existe
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generar nombre único: timestamp_random_originalname
    const uniqueSuffix = Date.now() + '_' + crypto.randomBytes(6).toString('hex');
    const extension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, extension).replace(/[^a-zA-Z0-9]/g, '_');
    
    const fileName = `${uniqueSuffix}_${baseName}${extension}`;
    cb(null, fileName);
  }
});

/**
 * Filtro de validación de archivos
 * Valida tipo MIME y extensión
 */
const fileFilter = (req, file, cb) => {
  try {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || '.pdf,.doc,.docx,.jpg,.jpeg,.png')
      .split(',')
      .map(type => type.trim().toLowerCase());
    
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];

    const fileExtension = path.extname(file.originalname).toLowerCase();
    const mimeType = file.mimetype.toLowerCase();

    // Validar extensión
    if (!allowedTypes.includes(fileExtension)) {
      return cb(new Error(`Tipo de archivo no permitido. Extensiones permitidas: ${allowedTypes.join(', ')}`), false);
    }

    // Validar MIME type
    if (!allowedMimeTypes.includes(mimeType)) {
      return cb(new Error(`Tipo MIME no permitido: ${mimeType}`), false);
    }

    // Validación adicional de seguridad
    if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
      return cb(new Error('Nombre de archivo contiene caracteres no permitidos'), false);
    }

    cb(null, true);
  } catch (error) {
    cb(new Error('Error en validación de archivo: ' + error.message), false);
  }
};

/**
 * Configuración principal de multer
 */
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB por defecto
    files: parseInt(process.env.DOCUMENTS_PER_CONVENIO_LIMIT) || 20 // 20 archivos por defecto
  }
});

/**
 * Middleware para validar que el convenio existe
 */
const validateConvenioExists = async (req, res, next) => {
  try {
    const convenioId = parseInt(req.params.convenioId);
    
    if (!convenioId || isNaN(convenioId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de convenio inválido'
      });
    }

    // La validación de existencia se hará en el controlador
    // para evitar importar prisma aquí
    req.convenioId = convenioId;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Error en validación de convenio'
    });
  }
};

/**
 * Middleware para manejar errores de multer
 */
const handleMulterErrors = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          error: `Archivo demasiado grande. Tamaño máximo: ${(parseInt(process.env.MAX_FILE_SIZE) || 10485760) / 1024 / 1024}MB`
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          error: `Demasiados archivos. Máximo permitido: ${process.env.DOCUMENTS_PER_CONVENIO_LIMIT || 20}`
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          error: 'Campo de archivo inesperado'
        });
      default:
        return res.status(400).json({
          success: false,
          error: 'Error en la subida de archivo: ' + error.message
        });
    }
  }

  if (error.message) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }

  next(error);
};

/**
 * Función utilitaria para limpiar archivos huérfanos
 */
const cleanupFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Error al eliminar archivo:', error);
  }
};

/**
 * Middleware para validar metadatos de archivo
 */
const validateFileMetadata = (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó ningún archivo'
      });
    }

    // Agregar metadatos calculados al request
    req.fileMetadata = {
      originalName: req.file.originalname,
      fileName: req.file.filename,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: new Date()
    };

    next();
  } catch (error) {
    if (req.file && req.file.path) {
      cleanupFile(req.file.path);
    }
    
    return res.status(500).json({
      success: false,
      error: 'Error en procesamiento de metadatos del archivo'
    });
  }
};

export {
  upload,
  validateConvenioExists,
  handleMulterErrors,
  validateFileMetadata,
  cleanupFile
};

export default upload;