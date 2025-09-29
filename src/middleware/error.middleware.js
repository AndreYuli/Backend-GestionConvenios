/**
 * @fileoverview Middleware centralizado para manejo de errores
 * @description Implementa manejo de errores estructurado con clases personalizadas
 * @module middleware/error
 */

import env from '../config/env.config.js';

/**
 * Clase base para errores de la API
 * Permite crear errores con código de estado HTTP y detalles adicionales
 */
export class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // Indica que es un error controlado
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error para recursos no encontrados (404)
 */
export class NotFoundError extends ApiError {
  constructor(message = 'Recurso no encontrado', details = null) {
    super(404, message, details);
  }
}

/**
 * Error para solicitudes no válidas (400)
 */
export class BadRequestError extends ApiError {
  constructor(message = 'Solicitud inválida', details = null) {
    super(400, message, details);
  }
}

/**
 * Error para problemas de autenticación (401)
 */
export class UnauthorizedError extends ApiError {
  constructor(message = 'No autorizado', details = null) {
    super(401, message, details);
  }
}

/**
 * Error para problemas de permisos (403)
 */
export class ForbiddenError extends ApiError {
  constructor(message = 'Acceso prohibido', details = null) {
    super(403, message, details);
  }
}

/**
 * Error para conflictos de datos (409)
 */
export class ConflictError extends ApiError {
  constructor(message = 'Conflicto de datos', details = null) {
    super(409, message, details);
  }
}

/**
 * Error para problemas de validación (422)
 */
export class ValidationError extends ApiError {
  constructor(message = 'Error de validación', details = null) {
    super(422, message, details);
  }
}

/**
 * Middleware para capturar errores de Zod
 * @param {Error} err - Error capturado
 * @param {Request} req - Objeto de solicitud Express
 * @param {Response} res - Objeto de respuesta Express
 * @param {NextFunction} next - Función next de Express
 */
export const zodErrorHandler = (err, req, res, next) => {
  if (err.name === 'ZodError') {
    const details = err.errors.map(e => ({
      path: e.path.join('.'),
      message: e.message
    }));
    
    return res.status(422).json({
      status: 'error',
      message: 'Error de validación',
      details
    });
  }
  next(err);
};

/**
 * Middleware para capturar errores de Prisma
 * @param {Error} err - Error capturado
 * @param {Request} req - Objeto de solicitud Express
 * @param {Response} res - Objeto de respuesta Express
 * @param {NextFunction} next - Función next de Express
 */
export const prismaErrorHandler = (err, req, res, next) => {
  // Errores de Prisma
  if (err.name === 'PrismaClientKnownRequestError') {
    // P2002: Unique constraint violation
    if (err.code === 'P2002') {
      const field = err.meta?.target?.[0] || 'campo';
      return res.status(409).json({
        status: 'error',
        message: `Ya existe un registro con ese ${field}`,
        code: 'UNIQUE_CONSTRAINT_VIOLATION'
      });
    }
    
    // P2025: Record not found
    if (err.code === 'P2025') {
      return res.status(404).json({
        status: 'error',
        message: 'Registro no encontrado',
        code: 'RECORD_NOT_FOUND'
      });
    }
  }
  
  next(err);
};

/**
 * Middleware para capturar errores de JWT
 * @param {Error} err - Error capturado
 * @param {Request} req - Objeto de solicitud Express
 * @param {Response} res - Objeto de respuesta Express
 * @param {NextFunction} next - Función next de Express
 */
export const jwtErrorHandler = (err, req, res, next) => {
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      message: 'Token inválido',
      code: 'INVALID_TOKEN'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'error',
      message: 'Token expirado',
      code: 'TOKEN_EXPIRED'
    });
  }
  
  next(err);
};

/**
 * Middleware para capturar errores personalizados de la API
 * @param {Error} err - Error capturado
 * @param {Request} req - Objeto de solicitud Express
 * @param {Response} res - Objeto de respuesta Express
 * @param {NextFunction} next - Función next de Express
 */
export const apiErrorHandler = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      ...(err.details && { details: err.details })
    });
  }
  
  next(err);
};

/**
 * Middleware para capturar errores no controlados
 * @param {Error} err - Error capturado
 * @param {Request} req - Objeto de solicitud Express
 * @param {Response} res - Objeto de respuesta Express
 * @param {NextFunction} next - Función next de Express
 */
export const globalErrorHandler = (err, req, res, next) => {
  // Loguear el error para depuración
  console.error('Error no controlado:', err);
  
  // En producción, no enviar detalles del error
  const statusCode = err.statusCode || 500;
  const message = env.NODE_ENV === 'production' 
    ? 'Error interno del servidor' 
    : err.message || 'Error interno del servidor';
  
  res.status(statusCode).json({
    status: 'error',
    message,
    ...(env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

/**
 * Middleware para manejar rutas no encontradas
 * @param {Request} req - Objeto de solicitud Express
 * @param {Response} res - Objeto de respuesta Express
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Ruta no encontrada',
    path: req.originalUrl
  });
};

/**
 * Función para aplicar todos los middlewares de manejo de errores
 * @param {Express} app - Aplicación Express
 */
export const applyErrorHandlers = (app) => {
  // Aplicar middlewares de manejo de errores en orden
  app.use(zodErrorHandler);
  app.use(prismaErrorHandler);
  app.use(jwtErrorHandler);
  app.use(apiErrorHandler);
  
  // Middleware para rutas no encontradas (debe ir después de todas las rutas)
  app.use(notFoundHandler);
  
  // Middleware global para errores no controlados (debe ser el último)
  app.use(globalErrorHandler);
};