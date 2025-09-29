/**
 * @fileoverview AuthService - Sistema de Autenticación con Patrones de Diseño
 * @description Implementa Strategy Pattern, Factory Pattern y análisis Big O
 * @author Sistema de Gestión de Convenios
 * @version 1.1.0
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import PasswordValidationService from './password-validation.service.js';
import TokenService from './token.service.js';
import logger from '../lib/logger.js';

const prisma = new PrismaClient();

/**
 * Strategy Pattern: Diferentes estrategias de autenticación
 * Complejidad: O(1) para selección de estrategia
 */
class AuthStrategy {
  authenticate(credentials) {
    throw new Error('authenticate() debe ser implementado por la clase hija');
  }
}

/**
 * Estrategia de autenticación por email/password
 * Complejidad total: O(log n) para búsqueda + O(1) para verificación de hash
 */
class EmailPasswordStrategy extends AuthStrategy {
  constructor() {
    super();
    // Inicializar servicio avanzado de validación de contraseñas
    this.passwordValidator = new PasswordValidationService({
      saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12,
      minTimeMs: 100 // Protección contra timing attacks
    });
  }

  async authenticate({ email, password }) {
    try {
      // Búsqueda optimizada O(log n) gracias al índice único en email
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        select: {
          id: true,
          email: true,
          password: true,
          rol: true,
          isActive: true,
          lastLogin: true
        }
      });

      if (!user) {
        return {
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: 'Correo o contraseña incorrectos'
        };
      }

      if (!user.isActive) {
        return {
          success: false,
          error: 'ACCOUNT_DISABLED',
          message: 'Cuenta deshabilitada. Contacta al administrador'
        };
      }

      // Verificación avanzada de contraseña: O(2^saltRounds) con protecciones de seguridad
      const validationResult = await this.passwordValidator.verifyPassword(password, user.password);

      if (!validationResult.success) {
        return {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Error en la validación de contraseña'
        };
      }

      if (!validationResult.isValid) {
        return {
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: 'Correo o contraseña incorrectos'
        };
      }

      // Actualizar última conexión: O(log n)
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          rol: user.rol,
          lastLogin: user.lastLogin
        }
      };

    } catch (error) {
      console.error('❌ Error en EmailPasswordStrategy:', error);
      return {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Error interno del servidor'
      };
    }
  }
}

/**
 * Factory Pattern: Crea diferentes tipos de tokens
 * Complejidad: O(1) para creación de tokens
 */
class TokenFactory {
  static createAccessToken(payload, options = {}) {
    const defaultOptions = {
      expiresIn: '1h',
      issuer: 'gestion-convenios',
      audience: 'gestion-convenios-client'
    };

    return jwt.sign(
      {
        ...payload,
        type: 'access',
        timestamp: Date.now()
      },
      process.env.JWT_SECRET,
      { ...defaultOptions, ...options }
    );
  }

  static createRefreshToken(payload) {
    return jwt.sign(
      {
        ...payload,
        type: 'refresh',
        timestamp: Date.now()
      },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      {
        expiresIn: '7d',
        issuer: 'gestion-convenios'
      }
    );
  }

  static verifyToken(token, type = 'access') {
    try {
      const secret = type === 'refresh' 
        ? (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET)
        : process.env.JWT_SECRET;

      const decoded = jwt.verify(token, secret);
      
      if (decoded.type !== type) {
        throw new Error('Invalid token type');
      }

      return { success: true, payload: decoded };
    } catch (error) {
      return { 
        success: false, 
        error: error.name,
        message: 'Token inválido o expirado'
      };
    }
  }
}

/**
 * Builder Pattern: Construye respuestas de autenticación consistentes
 * Complejidad: O(1) para construcción de respuesta
 */
class AuthResponseBuilder {
  constructor() {
    this.response = {
      success: false,
      message: '',
      data: null,
      errors: null,
      timestamp: new Date().toISOString()
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
    this.response.errors = errors;
    return this;
  }

  build() {
    return { ...this.response };
  }
}

/**
 * Servicio Principal de Autenticación
 * Implementa patrones Strategy, Factory y Builder
 */
class AuthService {
  constructor() {
    // Strategy Pattern: Mapa de estrategias de autenticación
    this.strategies = new Map([
      ['email_password', new EmailPasswordStrategy()]
    ]);
    
    // Inicializar servicio de validación de contraseñas
    this.passwordValidator = new PasswordValidationService({
      saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12,
      minTimeMs: 100
    });
    
    // Inicializar servicio de tokens
    this.tokenService = new TokenService();
  }

  /**
   * Login principal - Complejidad total: O(log n)
   * @param {Object} credentials - Credenciales de usuario
   * @param {string} strategy - Estrategia de autenticación a usar
   * @returns {Object} Respuesta de autenticación
   */
  async login(credentials, strategy = 'email_password') {
    const startTime = Date.now();

    try {
      // Strategy Pattern: Selección O(1)
      const authStrategy = this.strategies.get(strategy);
      
      if (!authStrategy) {
        return new AuthResponseBuilder()
          .setSuccess(false)
          .setMessage('Estrategia de autenticación no válida')
          .setErrors(['INVALID_STRATEGY'])
          .build();
      }

      // Autenticación: O(log n) total
      const authResult = await authStrategy.authenticate(credentials);

      if (!authResult.success) {
        return new AuthResponseBuilder()
          .setSuccess(false)
          .setMessage(authResult.message)
          .setErrors([authResult.error])
          .build();
      }

      // Generar par de tokens usando el servicio de tokens
      const tokenResult = await this.tokenService.generateTokenPair({
        userId: authResult.user.id,
        email: authResult.user.email,
        rol: authResult.user.rol
      });
      
      if (!tokenResult.success) {
        logger.error('Error al generar tokens', { error: tokenResult.error });
        return new AuthResponseBuilder()
          .setSuccess(false)
          .setMessage('Error al generar tokens de autenticación')
          .setErrors(['TOKEN_GENERATION_ERROR'])
          .build();
      }

      const executionTime = Date.now() - startTime;

      // Builder Pattern: Construcción de respuesta
      return new AuthResponseBuilder()
        .setSuccess(true)
        .setMessage('Inicio de sesión exitoso')
        .setData({
          user: {
            id: authResult.user.id,
            email: authResult.user.email,
            rol: authResult.user.rol,
            lastLogin: authResult.user.lastLogin
          },
          tokens: {
            accessToken: tokenResult.accessToken,
            refreshToken: tokenResult.refreshToken,
            expiresIn: Math.floor(tokenResult.accessTokenExpiry / 1000) // Convertir ms a segundos
          },
          performance: {
            executionTime: `${executionTime}ms`,
            strategy: strategy
          }
        })
        .build();

    } catch (error) {
      logger.error('Error en AuthService.login:', { error });
      
      return new AuthResponseBuilder()
        .setSuccess(false)
        .setMessage('Error interno del servidor')
        .setErrors(['INTERNAL_ERROR'])
        .build();
    }
  }

  /**
   * Validar token - Complejidad: O(1)
   * @param {string} token - Token JWT de acceso
   * @returns {Object} Resultado de validación con payload si es válido
   */
  async validateToken(token) {
    return this.tokenService.verifyAccessToken(token);
  }

  /**
   * Buscar usuario por email - Complejidad: O(log n)
   * @param {string} email - Email del usuario
   * @returns {Object|null} Usuario encontrado o null
   */
  async findUserByEmail(email) {
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        select: {
          id: true,
          email: true,
          rol: true,
          isActive: true,
          createdAt: true,
          lastLogin: true
        }
      });
      
      return user;
    } catch (error) {
      logger.error('Error buscando usuario por email:', { error });
      return null;
    }
  }

  /**
   * Crear nuevo usuario - Complejidad: O(log n)
   * @param {Object} userData - Datos del usuario
   * @returns {Object} Resultado de la creación
   */
  async createUser(userData) {
    try {
      const { email, password, rol = 'CONSULTOR' } = userData;
      
      // Hash de la contraseña usando el mismo servicio de validación
      const hashResult = await this.passwordValidator.hashPassword(password);
      
      if (!hashResult.success) {
        return {
          success: false,
          message: 'Error procesando la contraseña',
          error: 'PASSWORD_HASH_ERROR'
        };
      }

      // Crear usuario en base de datos
      const newUser = await prisma.user.create({
        data: {
          email: email.toLowerCase().trim(),
          password: hashResult.hash,
          rol: rol,
          isActive: true
        },
        select: {
          id: true,
          email: true,
          rol: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      });

      logger.info(`Usuario creado exitosamente`, {
        userId: newUser.id,
        email: newUser.email,
        rol: newUser.rol
      });

      return {
        success: true,
        user: newUser,
        message: 'Usuario creado exitosamente'
      };

    } catch (error) {
      logger.error('Error creando usuario:', { error });

      // Manejar errores específicos de Prisma
      if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
        logger.warn('Intento de registro con email duplicado', { email: userData.email });
        return {
          success: false,
          message: 'El email ya está registrado',
          error: 'EMAIL_ALREADY_EXISTS'
        };
      }

      return {
        success: false,
        message: 'Error interno creando usuario',
        error: 'USER_CREATION_ERROR'
      };
    }
  }

  /**
   * Obtener estrategias disponibles - Complejidad: O(1)
   */
  getAvailableStrategies() {
    return Array.from(this.strategies.keys());
  }

  /**
   * Análisis de complejidad del servicio
   */
  static getComplexityAnalysis() {
    return {
      login: 'O(log n) - Búsqueda de usuario en BD con índice',
      userCreation: 'O(log n) - Inserción en BD con índices',
      userSearch: 'O(log n) - Búsqueda por email indexado',
      tokenCreation: 'O(1) - Creación de JWT',
      tokenValidation: 'O(1) - Verificación de JWT',
      tokenRefresh: 'O(log n) - Verificación y rotación de tokens',
      strategySelection: 'O(1) - Map lookup',
      responseBuilding: 'O(1) - Construcción de objeto'
    };
  }
}

export default AuthService;
export { AuthResponseBuilder };