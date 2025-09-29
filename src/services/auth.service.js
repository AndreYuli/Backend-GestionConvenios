/**
 * @fileoverview AuthService - Sistema de Autenticación con Patrones de Diseño
 * @description Implementa Strategy Pattern, Factory Pattern y análisis Big O
 * @author Sistema de Gestión de Convenios
 * @version 1.0.0
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

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

      // Verificación de contraseña: O(1) amortizado con bcrypt
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
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

      // Factory Pattern: Creación de tokens O(1)
      const accessToken = TokenFactory.createAccessToken({
        userId: authResult.user.id,
        email: authResult.user.email,
        rol: authResult.user.rol
      });

      const refreshToken = TokenFactory.createRefreshToken({
        userId: authResult.user.id
      });

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
            accessToken,
            refreshToken,
            expiresIn: 3600 // 1 hora en segundos
          },
          performance: {
            executionTime: `${executionTime}ms`,
            strategy: strategy
          }
        })
        .build();

    } catch (error) {
      console.error('❌ Error en AuthService.login:', error);
      
      return new AuthResponseBuilder()
        .setSuccess(false)
        .setMessage('Error interno del servidor')
        .setErrors(['INTERNAL_ERROR'])
        .build();
    }
  }

  /**
   * Validar token - Complejidad: O(1)
   */
  async validateToken(token, type = 'access') {
    return TokenFactory.verifyToken(token, type);
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
      tokenCreation: 'O(1) - Creación de JWT',
      tokenValidation: 'O(1) - Verificación de JWT',
      strategySelection: 'O(1) - Map lookup',
      responseBuilding: 'O(1) - Construcción de objeto'
    };
  }
}

export default AuthService;
export { TokenFactory, AuthResponseBuilder };