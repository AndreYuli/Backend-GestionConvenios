/**
 * @fileoverview Servicio de logging estructurado para la aplicación
 * @description Implementa un sistema de logging estructurado con niveles y formatos configurables
 * @module lib/logger
 */

import winston from 'winston';
import env from '../config/env.config.js';

// Formato personalizado para logs
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata(),
  winston.format.json()
);

// Configuración de transports según el entorno
const transports = [];

// En desarrollo, mostrar logs en consola con colores
if (env.NODE_ENV === 'development') {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, metadata }) => {
          const metaStr = metadata && Object.keys(metadata).length > 0 && metadata.stack !== undefined
            ? `\n${metadata.stack}`
            : metadata && Object.keys(metadata).length > 0
              ? `\n${JSON.stringify(metadata, null, 2)}`
              : '';
          
          return `${timestamp} [${level}]: ${message}${metaStr}`;
        })
      )
    })
  );
}

// En producción, guardar logs en archivos
if (env.NODE_ENV === 'production') {
  // Logs de error en archivo separado
  transports.push(
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Todos los logs en archivo combinado
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Crear logger con la configuración
const logger = winston.createLogger({
  level: env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: customFormat,
  defaultMeta: { service: 'gestion-convenios-api' },
  transports,
  // No salir en caso de error no controlado
  exitOnError: false,
});

/**
 * Middleware para logging de solicitudes HTTP
 * @param {Request} req - Objeto de solicitud Express
 * @param {Response} res - Objeto de respuesta Express
 * @param {NextFunction} next - Función next de Express
 */
export const requestLogger = (req, res, next) => {
  // Tiempo de inicio de la solicitud
  const start = Date.now();
  
  // Registrar datos de la solicitud
  const requestData = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  };
  
  // Registrar solicitud entrante
  logger.info(`Solicitud entrante: ${req.method} ${req.originalUrl}`, { request: requestData });
  
  // Capturar respuesta
  const originalSend = res.send;
  res.send = function(body) {
    const responseTime = Date.now() - start;
    
    // Registrar respuesta saliente
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    logger[logLevel](`Respuesta: ${res.statusCode} ${req.method} ${req.originalUrl} - ${responseTime}ms`, {
      response: {
        statusCode: res.statusCode,
        responseTime,
        contentLength: body ? body.length : 0,
      },
      request: requestData,
    });
    
    return originalSend.call(this, body);
  };
  
  next();
};

/**
 * Registra un mensaje de depuración
 * @param {string} message - Mensaje a registrar
 * @param {Object} [meta] - Metadatos adicionales
 */
export const debug = (message, meta = {}) => {
  logger.debug(message, meta);
};

/**
 * Registra un mensaje informativo
 * @param {string} message - Mensaje a registrar
 * @param {Object} [meta] - Metadatos adicionales
 */
export const info = (message, meta = {}) => {
  logger.info(message, meta);
};

/**
 * Registra un mensaje de advertencia
 * @param {string} message - Mensaje a registrar
 * @param {Object} [meta] - Metadatos adicionales
 */
export const warn = (message, meta = {}) => {
  logger.warn(message, meta);
};

/**
 * Registra un mensaje de error
 * @param {string} message - Mensaje a registrar
 * @param {Error|Object} [error] - Error o metadatos adicionales
 */
export const error = (message, error = {}) => {
  logger.error(message, { error });
};

/**
 * Registra un mensaje crítico
 * @param {string} message - Mensaje a registrar
 * @param {Error|Object} [error] - Error o metadatos adicionales
 */
export const critical = (message, error = {}) => {
  logger.error(`[CRÍTICO] ${message}`, { error, critical: true });
};

export default {
  debug,
  info,
  warn,
  error,
  critical,
  requestLogger,
};