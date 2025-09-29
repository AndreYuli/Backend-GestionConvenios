/**
 * @fileoverview Rutas de Autenticación - /api/auth/*
 * @description Sistema de rutas con rate limiting, validación y middleware de seguridad
 * @author Sistema de Gestión de Convenios
 * @version 1.0.0
 */

import { Router } from 'express';
import { login, getCurrentUser, logout } from '../controllers/auth.controller.js';
import { loginRateLimit, AuthMiddlewareFactory } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * Middleware específico para rutas de autenticación
 */
const authMiddleware = AuthMiddlewareFactory.createBasic();
const authWithLogging = AuthMiddlewareFactory.createWithLogging();

/**
 * POST /api/auth/login
 * Endpoint principal de autenticación
 * 
 * Features:
 * - Rate limiting: 5 intentos por IP cada 15 minutos
 * - Validación Zod de entrada
 * - Respuestas seguras sin revelar información sensible
 * - Logging de seguridad
 * 
 * Complejidad: O(log n) para búsqueda de usuario
 * 
 * @body {string} email - Email del usuario (requerido)
 * @body {string} password - Contraseña del usuario (requerido)
 * @body {boolean} [rememberMe] - Mantener sesión activa (opcional)
 * @body {object} [deviceInfo] - Información del dispositivo (opcional)
 * 
 * @returns {Object} 200 - Login exitoso con tokens
 * @returns {Object} 400 - Errores de validación
 * @returns {Object} 401 - Credenciales inválidas
 * @returns {Object} 429 - Demasiados intentos
 * @returns {Object} 500 - Error interno
 */
router.post('/login', 
  loginRateLimit,  // Rate limiting específico para login
  login           // Controlador de login
);

/**
 * GET /api/auth/me
 * Obtener información del usuario autenticado
 * 
 * Features:
 * - Requiere token JWT válido
 * - Información básica del usuario sin datos sensibles
 * - Validación de usuario activo
 * 
 * Complejidad: O(1) - información desde token
 * 
 * @header {string} Authorization - Bearer token (requerido)
 * 
 * @returns {Object} 200 - Información del usuario
 * @returns {Object} 401 - Token inválido o faltante
 * @returns {Object} 500 - Error interno
 */
router.get('/me', 
  authWithLogging,  // Middleware con logging
  getCurrentUser    // Controlador para obtener usuario actual
);

/**
 * POST /api/auth/logout
 * Cerrar sesión del usuario
 * 
 * Features:
 * - Requiere token JWT válido
 * - Invalidación del token del lado del cliente
 * - Logging de cierre de sesión
 * 
 * Complejidad: O(1) - solo confirmación
 * 
 * @header {string} Authorization - Bearer token (requerido)
 * 
 * @returns {Object} 200 - Logout exitoso
 * @returns {Object} 401 - Token inválido
 * @returns {Object} 500 - Error interno
 */
router.post('/logout', 
  authMiddleware,  // Middleware de autenticación básico
  logout          // Controlador de logout
);

/**
 * GET /api/auth/status
 * Verificar estado del sistema de autenticación
 * 
 * Features:
 * - Endpoint de health check
 * - No requiere autenticación
 * - Información del sistema
 * 
 * Complejidad: O(1)
 * 
 * @returns {Object} 200 - Estado del sistema
 */
router.get('/status', (req, res) => {
  try {
    const response = {
      success: true,
      message: 'Sistema de autenticación operativo',
      data: {
        service: 'auth-service',
        version: '1.0.0',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        features: {
          login: 'available',
          logout: 'available',
          tokenValidation: 'available',
          rateLimit: 'active',
          securityLogging: 'active'
        },
        endpoints: {
          'POST /api/auth/login': 'Login con email/password',
          'GET /api/auth/me': 'Información del usuario actual',
          'POST /api/auth/logout': 'Cerrar sesión',
          'GET /api/auth/status': 'Estado del sistema'
        },
        performance: {
          loginComplexity: 'O(log n)',
          tokenValidation: 'O(1)',
          rateLimitCheck: 'O(1)'
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Error en /auth/status:', error);
    res.status(500).json({
      success: false,
      message: 'Error verificando estado del sistema',
      error: 'HEALTH_CHECK_ERROR'
    });
  }
});

/**
 * Middleware para manejar rutas no encontradas en /api/auth/*
 * Complejidad: O(1)
 */
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta ${req.method} ${req.originalUrl} no encontrada`,
    error: 'AUTH_ROUTE_NOT_FOUND',
    availableRoutes: [
      'POST /api/auth/login',
      'GET /api/auth/me',
      'POST /api/auth/logout',
      'GET /api/auth/status'
    ]
  });
});

/**
 * Middleware de manejo de errores específico para auth
 * Complejidad: O(1)
 */
router.use((error, req, res, next) => {
  console.error('❌ Error en rutas de autenticación:', error);
  
  // Si la respuesta ya fue enviada, delegar al manejador por defecto
  if (res.headersSent) {
    return next(error);
  }

  // Manejar diferentes tipos de errores
  let statusCode = 500;
  let message = 'Error interno en el sistema de autenticación';
  let errorCode = 'AUTH_INTERNAL_ERROR';

  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Error de validación en datos de autenticación';
    errorCode = 'AUTH_VALIDATION_ERROR';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token de autenticación inválido';
    errorCode = 'INVALID_TOKEN';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token de autenticación expirado';
    errorCode = 'EXPIRED_TOKEN';
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: errorCode,
    timestamp: new Date().toISOString()
  });
});

export default router;