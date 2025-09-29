/**
 * @fileoverview Middleware CORS Avanzado para Gestión de Convenios
 * @description Configuración CORS segura que soporta credenciales y múltiples entornos
 * @author Sistema de Gestión de Convenios
 * @version 1.0.0
 */

/**
 * Configuración CORS dinámica basada en el entorno
 */
export const createCorsConfig = () => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  return {
    // Orígenes permitidos dinámicamente
    origin: (origin, callback) => {
      // Lista base de orígenes de desarrollo
      let allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001', 
        'http://localhost:4200',
        'http://localhost:5173',
        'http://localhost:5174',  // Agregado para tu frontend
        'http://localhost:8080',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174'   // Agregado para tu frontend
      ];

      // Agregar orígenes desde variables de entorno
      if (process.env.ALLOWED_ORIGINS) {
        const envOrigins = process.env.ALLOWED_ORIGINS.split(',').map(url => url.trim());
        allowedOrigins = [...allowedOrigins, ...envOrigins];
      }

      // Agregar URL de producción si está definida
      if (process.env.FRONTEND_PRODUCTION_URL) {
        allowedOrigins.push(process.env.FRONTEND_PRODUCTION_URL);
      }

      // Remover duplicados
      allowedOrigins = [...new Set(allowedOrigins)];

      // En desarrollo, permitir requests sin origin (Postman, pruebas locales)
      if (isDevelopment && !origin) {
        return callback(null, true);
      }

      // Verificar si el origin está en la lista permitida
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`🚫 CORS: Origin bloqueado - ${origin}`);
        callback(new Error(`CORS: Origin ${origin} no permitido`), false);
      }
    },

    // Permitir credenciales
    credentials: true,

    // Headers permitidos
    allowedHeaders: [
      'Origin',
      'X-Requested-With', 
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
      'Pragma',
      'X-API-Key'
    ],

    // Métodos HTTP permitidos
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

    // Headers expuestos al cliente
    exposedHeaders: [
      'Authorization',
      'X-Total-Count',
      'X-Page-Count'
    ],

    // Cache para preflight requests (24 horas)
    maxAge: 86400,

    // No continuar con el siguiente middleware en preflight
    preflightContinue: false,

    // Status code para OPTIONS request exitoso
    optionsSuccessStatus: 204
  };
};

/**
 * Middleware para logging de requests CORS
 */
export const corsLogger = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    console.log(`🔄 CORS Preflight: ${req.get('Origin')} -> ${req.originalUrl}`);
  } else if (req.get('Origin')) {
    console.log(`🌐 CORS Request: ${req.get('Origin')} -> ${req.method} ${req.originalUrl}`);
  }
  next();
};

/**
 * Middleware de error CORS personalizado
 */
export const corsErrorHandler = (error, req, res, next) => {
  if (error.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      message: 'Acceso CORS denegado',
      error: 'CORS_BLOCKED',
      origin: req.get('Origin'),
      timestamp: new Date().toISOString()
    });
  }
  next(error);
};

/**
 * Headers de seguridad adicionales
 */
export const securityHeaders = (req, res, next) => {
  // Prevenir ataques de clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevenir MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Habilitar XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
};