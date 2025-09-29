/**
 * @fileoverview Middleware de Autenticación con Decorator Pattern y Rate Limiting
 * @description Sistema de middleware robusto con análisis Big O y seguridad avanzada
 * @author Sistema de Gestión de Convenios
 * @version 1.0.0
 */

import rateLimit from 'express-rate-limit';
import { TokenFactory } from '../services/auth.service.js';

/**
 * Decorator Pattern: Base para decorar middlewares
 * Complejidad: O(1) para aplicación de decoradores
 */
class MiddlewareDecorator {
  constructor(middleware) {
    this.middleware = middleware;
  }

  apply(req, res, next) {
    return this.middleware(req, res, next);
  }
}

/**
 * Decorator para Rate Limiting - Previene ataques de fuerza bruta
 * Complejidad: O(1) para verificación usando memoria/Redis
 */
class RateLimitDecorator extends MiddlewareDecorator {
  constructor(middleware, options = {}) {
    super(middleware);
    this.rateLimiter = rateLimit({
      windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutos
      max: options.max || 5, // máximo 5 intentos por ventana
      message: {
        success: false,
        message: 'Demasiados intentos de inicio de sesión. Intenta nuevamente en 15 minutos.',
        error: 'TOO_MANY_REQUESTS',
        retryAfter: Math.ceil((options.windowMs || 15 * 60 * 1000) / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      // No usar keyGenerator personalizado para evitar problemas IPv6
      skip: (req) => {
        // Skip rate limiting para desarrollo local
        return req.ip === '127.0.0.1' && process.env.NODE_ENV === 'development';
      }
    });
  }

  apply(req, res, next) {
    // Aplicar rate limiting primero, luego el middleware original
    this.rateLimiter(req, res, (err) => {
      if (err) return next(err);
      return super.apply(req, res, next);
    });
  }
}

/**
 * Decorator para Logging de seguridad
 * Complejidad: O(1) para logging
 */
class SecurityLogDecorator extends MiddlewareDecorator {
  apply(req, res, next) {
    const startTime = Date.now();
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'Unknown';
    
    console.log(`🔐 [AUTH] ${new Date().toISOString()} - IP: ${ip} - UserAgent: ${userAgent}`);
    
    // Interceptar la respuesta para logging adicional
    const originalSend = res.send;
    res.send = function(data) {
      const executionTime = Date.now() - startTime;
      const statusCode = res.statusCode;
      
      if (statusCode >= 400) {
        console.log(`⚠️ [AUTH_FAIL] Status: ${statusCode} - Time: ${executionTime}ms - IP: ${ip}`);
      } else {
        console.log(`✅ [AUTH_SUCCESS] Status: ${statusCode} - Time: ${executionTime}ms - IP: ${ip}`);
      }
      
      return originalSend.call(this, data);
    };

    return super.apply(req, res, next);
  }
}

/**
 * Middleware base de autenticación
 * Complejidad: O(1) para validación de JWT
 */
const baseAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido',
        error: 'MISSING_TOKEN'
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Formato de token inválido. Use: Bearer <token>',
        error: 'INVALID_TOKEN_FORMAT'
      });
    }

    const token = authHeader.substring(7); // Remover "Bearer "
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token vacío',
        error: 'EMPTY_TOKEN'
      });
    }

    // Validar token: O(1)
    const tokenValidation = TokenFactory.verifyToken(token, 'access');
    
    if (!tokenValidation.success) {
      return res.status(401).json({
        success: false,
        message: tokenValidation.message,
        error: tokenValidation.error
      });
    }

    // Agregar información del usuario al request
    req.user = {
      id: tokenValidation.payload.userId,
      email: tokenValidation.payload.email,
      rol: tokenValidation.payload.rol,
      tokenIat: tokenValidation.payload.iat,
      tokenExp: tokenValidation.payload.exp
    };

    next();
  } catch (error) {
    console.error('❌ Error en authMiddleware:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno de autenticación',
      error: 'INTERNAL_AUTH_ERROR'
    });
  }
};

/**
 * Factory para crear diferentes tipos de middleware de auth
 * Complejidad: O(1) para creación
 */
class AuthMiddlewareFactory {
  /**
   * Crear middleware de autenticación básico
   */
  static createBasic() {
    return baseAuthMiddleware;
  }

  /**
   * Crear middleware con rate limiting para login
   */
  static createWithRateLimit(options = {}) {
    const rateLimitedMiddleware = new RateLimitDecorator(
      baseAuthMiddleware, 
      {
        windowMs: 15 * 60 * 1000, // 15 minutos
        max: 5, // 5 intentos por ventana
        ...options
      }
    );

    return (req, res, next) => rateLimitedMiddleware.apply(req, res, next);
  }

  /**
   * Crear middleware con logging de seguridad
   */
  static createWithLogging() {
    const loggingMiddleware = new SecurityLogDecorator(baseAuthMiddleware);
    return (req, res, next) => loggingMiddleware.apply(req, res, next);
  }

  /**
   * Crear middleware completo (rate limiting + logging)
   */
  static createComplete(rateLimitOptions = {}) {
    // Aplicar múltiples decoradores
    let middleware = baseAuthMiddleware;
    
    // Aplicar rate limiting
    middleware = new RateLimitDecorator(middleware, {
      windowMs: 15 * 60 * 1000,
      max: 5,
      ...rateLimitOptions
    });
    
    // Aplicar logging
    middleware = new SecurityLogDecorator(middleware);

    return (req, res, next) => middleware.apply(req, res, next);
  }

  /**
   * Crear middleware para verificar roles específicos
   * Complejidad: O(1) para verificación de rol
   */
  static createRoleGuard(allowedRoles = []) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
          error: 'NOT_AUTHENTICATED'
        });
      }

      if (!allowedRoles.includes(req.user.rol)) {
        return res.status(403).json({
          success: false,
          message: 'Permisos insuficientes para acceder a este recurso',
          error: 'INSUFFICIENT_PERMISSIONS',
          requiredRoles: allowedRoles,
          userRole: req.user.rol
        });
      }

      next();
    };
  }
}

/**
 * Rate limiter específico para login (más restrictivo)
 * Complejidad: O(1) usando tabla hash en memoria
 */
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos de login por IP en 15 minutos
  message: {
    success: false,
    message: 'Demasiados intentos de inicio de sesión desde esta IP. Intenta nuevamente en 15 minutos.',
    error: 'TOO_MANY_LOGIN_ATTEMPTS',
    retryAfter: 900 // 15 minutos en segundos
  },
  standardHeaders: true,
  legacyHeaders: false
  // Usar keyGenerator por defecto para evitar problemas IPv6
});

/**
 * Middleware para validar que el usuario esté activo
 * Complejidad: O(log n) para consulta en BD
 */
const validateActiveUser = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no identificado',
        error: 'USER_NOT_IDENTIFIED'
      });
    }

    // Verificar que el usuario siga activo en la BD
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { isActive: true, rol: true }
    });

    await prisma.$disconnect();

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Usuario inactivo o no encontrado',
        error: 'USER_INACTIVE'
      });
    }

    // Actualizar rol en el request por si cambió
    req.user.rol = user.rol;
    
    next();
  } catch (error) {
    console.error('❌ Error validando usuario activo:', error);
    res.status(500).json({
      success: false,
      message: 'Error verificando estado del usuario',
      error: 'USER_VALIDATION_ERROR'
    });
  }
};

export {
  AuthMiddlewareFactory,
  loginRateLimit,
  validateActiveUser,
  baseAuthMiddleware
};

export default AuthMiddlewareFactory;