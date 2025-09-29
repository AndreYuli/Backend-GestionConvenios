/**
 * @fileoverview Controlador de Autenticación - POST /api/auth/login
 * @description Implementa el endpoint de login con validación Zod y manejo de errores
 * @author Sistema de Gestión de Convenios
 * @version 1.0.0
 */

import { z } from 'zod';
import AuthService from '../services/auth.service.js';

/**
 * Esquema de validación para login usando Zod
 * Complejidad de validación: O(1) para cada campo
 */
const loginSchema = z.object({
  email: z
    .string({
      required_error: 'El email es requerido',
      invalid_type_error: 'El email debe ser un string'
    })
    .email({
      message: 'Formato de email inválido'
    })
    .min(1, 'El email no puede estar vacío')
    .max(255, 'El email es demasiado largo (máximo 255 caracteres)')
    .toLowerCase()
    .trim(),
  
  password: z
    .string({
      required_error: 'La contraseña es requerida',
      invalid_type_error: 'La contraseña debe ser un string'
    })
    .min(1, 'La contraseña no puede estar vacía')
    .max(200, 'La contraseña es demasiado larga')
});

/**
 * Esquema opcional para parámetros adicionales
 */
const loginOptionsSchema = z.object({
  rememberMe: z.boolean().optional().default(false),
  deviceInfo: z.object({
    type: z.enum(['web', 'mobile', 'desktop']).optional(),
    name: z.string().max(100).optional(),
    userAgent: z.string().max(500).optional()
  }).optional()
}).optional();

/**
 * Builder Pattern para respuestas HTTP consistentes
 * Complejidad: O(1) para construcción
 */
class HttpResponseBuilder {
  constructor() {
    this.response = {
      success: false,
      message: '',
      data: null,
      errors: null,
      timestamp: new Date().toISOString(),
      requestId: null
    };
  }

  setSuccess(success) {
    this.response.success = success;
    return this;
  }

  setMessage(message) {
    this.response.message = message;
    return this;
  }

  setData(data) {
    this.response.data = data;
    return this;
  }

  setErrors(errors) {
    this.response.errors = Array.isArray(errors) ? errors : [errors];
    return this;
  }

  setRequestId(requestId) {
    this.response.requestId = requestId;
    return this;
  }

  build() {
    return { ...this.response };
  }
}

/**
 * Clase para manejar errores de validación
 * Complejidad: O(n) donde n es el número de errores de validación
 */
class ValidationErrorHandler {
  static formatZodErrors(zodError) {
    return zodError.errors.map(error => ({
      field: error.path.join('.'),
      message: error.message,
      code: error.code
    }));
  }

  static createValidationResponse(errors, requestId = null) {
    return new HttpResponseBuilder()
      .setSuccess(false)
      .setMessage('Errores de validación en los datos enviados')
      .setErrors(errors)
      .setRequestId(requestId)
      .build();
  }
}

/**
 * Controlador principal de autenticación
 */
class AuthController {
  constructor() {
    this.authService = new AuthService();
  }

  /**
   * POST /api/auth/login - Endpoint principal de login
   * Complejidad total: O(log n) donde n es el número de usuarios
   * 
   * @param {Object} req - Request de Express
   * @param {Object} res - Response de Express
   * @returns {Object} Respuesta JSON
   */
  async login(req, res) {
    const startTime = Date.now();
    const requestId = `login_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      console.log(`🔐 [LOGIN_START] RequestID: ${requestId} - IP: ${req.ip}`);

      // Validación de entrada: O(1) por campo
      const validationResult = loginSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        console.log(`❌ [LOGIN_VALIDATION_ERROR] RequestID: ${requestId}`);
        
        const validationErrors = ValidationErrorHandler.formatZodErrors(validationResult.error);
        const response = ValidationErrorHandler.createValidationResponse(validationErrors, requestId);
        
        return res.status(400).json(response);
      }

      const { email, password } = validationResult.data;
      
      // Validación opcional de parámetros adicionales
      const optionsValidation = loginOptionsSchema.safeParse(req.body);
      const options = optionsValidation.success ? optionsValidation.data : {};

      // Log de intento de login (sin credenciales sensibles)
      console.log(`🔍 [LOGIN_ATTEMPT] Email: ${email} - RequestID: ${requestId}`);

      // Proceso de autenticación: O(log n)
      const authResult = await this.authService.login(
        { email, password },
        'email_password'
      );

      const executionTime = Date.now() - startTime;

      if (!authResult.success) {
        console.log(`❌ [LOGIN_FAILED] Email: ${email} - Reason: ${authResult.errors?.[0]} - Time: ${executionTime}ms`);
        
        // Respuesta consistente para credenciales inválidas (no revelar detalles específicos)
        const response = new HttpResponseBuilder()
          .setSuccess(false)
          .setMessage(authResult.message)
          .setErrors(authResult.errors)
          .setRequestId(requestId)
          .build();

        return res.status(401).json(response);
      }

      // Login exitoso
      console.log(`✅ [LOGIN_SUCCESS] Email: ${email} - UserID: ${authResult.data.user.id} - Time: ${executionTime}ms`);

      // Preparar respuesta exitosa
      const responseData = {
        user: authResult.data.user,
        tokens: authResult.data.tokens,
        session: {
          loginTime: new Date().toISOString(),
          deviceInfo: options.deviceInfo || {
            type: 'web',
            userAgent: req.get('User-Agent')
          },
          rememberMe: options.rememberMe || false
        },
        performance: {
          ...authResult.data.performance,
          totalTime: `${executionTime}ms`
        }
      };

      const response = new HttpResponseBuilder()
        .setSuccess(true)
        .setMessage('Inicio de sesión exitoso')
        .setData(responseData)
        .setRequestId(requestId)
        .build();

      // Headers de seguridad adicionales
      res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block'
      });

      return res.status(200).json(response);

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`💥 [LOGIN_INTERNAL_ERROR] RequestID: ${requestId} - Time: ${executionTime}ms`, error);

      const response = new HttpResponseBuilder()
        .setSuccess(false)
        .setMessage('Error interno del servidor. Intenta nuevamente.')
        .setErrors(['INTERNAL_SERVER_ERROR'])
        .setRequestId(requestId)
        .build();

      return res.status(500).json(response);
    }
  }

  /**
   * GET /api/auth/me - Obtener información del usuario actual
   * Complejidad: O(1) - usa información del token
   */
  async getCurrentUser(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
          error: 'NOT_AUTHENTICATED'
        });
      }

      const response = new HttpResponseBuilder()
        .setSuccess(true)
        .setMessage('Información del usuario obtenida exitosamente')
        .setData({
          user: {
            id: req.user.id,
            email: req.user.email,
            rol: req.user.rol
          },
          token: {
            issuedAt: new Date(req.user.tokenIat * 1000).toISOString(),
            expiresAt: new Date(req.user.tokenExp * 1000).toISOString()
          }
        })
        .build();

      return res.status(200).json(response);
    } catch (error) {
      console.error('❌ Error en getCurrentUser:', error);
      
      const response = new HttpResponseBuilder()
        .setSuccess(false)
        .setMessage('Error obteniendo información del usuario')
        .setErrors(['INTERNAL_ERROR'])
        .build();

      return res.status(500).json(response);
    }
  }

  /**
   * POST /api/auth/logout - Cerrar sesión
   * Complejidad: O(1) - solo confirma el logout
   */
  async logout(req, res) {
    try {
      console.log(`🚪 [LOGOUT] UserID: ${req.user?.id} - Email: ${req.user?.email}`);

      const response = new HttpResponseBuilder()
        .setSuccess(true)
        .setMessage('Sesión cerrada exitosamente')
        .setData({
          logoutTime: new Date().toISOString(),
          message: 'Token invalidado del lado del cliente'
        })
        .build();

      return res.status(200).json(response);
    } catch (error) {
      console.error('❌ Error en logout:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Error cerrando sesión',
        error: 'LOGOUT_ERROR'
      });
    }
  }

  /**
   * Análisis de complejidad del controlador
   */
  static getComplexityAnalysis() {
    return {
      login: 'O(log n) - Validación O(1) + Autenticación O(log n)',
      getCurrentUser: 'O(1) - Información desde token',
      logout: 'O(1) - Solo respuesta de confirmación',
      validation: 'O(k) donde k = número de campos a validar',
      responseBuilding: 'O(1) - Construcción de objeto respuesta'
    };
  }
}

// Crear instancia del controlador
const authController = new AuthController();

// Exportar métodos bound para usar en rutas
export const login = authController.login.bind(authController);
export const getCurrentUser = authController.getCurrentUser.bind(authController);
export const logout = authController.logout.bind(authController);

export default AuthController;