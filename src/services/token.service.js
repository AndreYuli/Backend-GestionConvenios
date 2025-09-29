/**
 * @fileoverview Servicio de gestión avanzada de tokens JWT
 * @description Implementa rotación de tokens, blacklisting y seguridad avanzada
 * @author Sistema de Gestión de Convenios
 * @version 1.0.0
 */

import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

/**
 * @class TokenService
 * @description Servicio avanzado para gestión de tokens JWT con rotación y blacklisting
 */
class TokenService {
  constructor() {
    this.accessTokenSecret = process.env.JWT_SECRET;
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '15m'; // 15 minutos por defecto
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d'; // 7 días por defecto
  }

  /**
   * Genera un nuevo par de tokens (access + refresh)
   * @param {Object} payload - Datos del usuario para incluir en el token
   * @returns {Object} Par de tokens generados
   */
  async generateTokenPair(payload) {
    try {
      // Generar identificador único para el token
      const jti = crypto.randomBytes(16).toString('hex');
      const now = Math.floor(Date.now() / 1000);
      
      // Crear access token con tiempo de vida corto
      const accessToken = jwt.sign(
        {
          ...payload,
          type: 'access',
          jti: jti,
          iat: now
        },
        this.accessTokenSecret,
        { expiresIn: this.accessTokenExpiry }
      );

      // Crear refresh token con tiempo de vida más largo
      const refreshToken = jwt.sign(
        {
          userId: payload.userId,
          type: 'refresh',
          jti: jti,
          iat: now
        },
        this.refreshTokenSecret,
        { expiresIn: this.refreshTokenExpiry }
      );

      // Almacenar el refresh token en la base de datos para control
      await this.storeRefreshToken(payload.userId, jti, refreshToken);

      return {
        success: true,
        accessToken,
        refreshToken,
        accessTokenExpiry: this.getExpiryTime(this.accessTokenExpiry),
        refreshTokenExpiry: this.getExpiryTime(this.refreshTokenExpiry)
      };
    } catch (error) {
      console.error('Error generando par de tokens:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Almacena un refresh token en la base de datos
   * @param {string} userId - ID del usuario
   * @param {string} jti - Identificador único del token
   * @param {string} token - Token de refresco
   * @returns {Object} Token almacenado
   */
  async storeRefreshToken(userId, jti, token) {
    try {
      // Calcular fecha de expiración
      const decoded = jwt.decode(token);
      const expiresAt = new Date(decoded.exp * 1000);

      // Almacenar en la base de datos
      return await prisma.refreshToken.create({
        data: {
          jti,
          token: this.hashToken(token), // Almacenar hash en lugar del token
          userId,
          expiresAt,
          isRevoked: false
        }
      });
    } catch (error) {
      console.error('Error almacenando refresh token:', error);
      throw new Error('Error almacenando token de refresco');
    }
  }

  /**
   * Refresca un token de acceso usando un refresh token
   * @param {string} refreshToken - Token de refresco
   * @returns {Object} Nuevo par de tokens
   */
  async refreshTokens(refreshToken) {
    try {
      // Verificar el refresh token
      const decoded = jwt.verify(refreshToken, this.refreshTokenSecret);
      
      // Validar que sea un refresh token
      if (decoded.type !== 'refresh') {
        throw new Error('Token inválido');
      }

      // Verificar que el token no esté en la lista negra
      const storedToken = await prisma.refreshToken.findUnique({
        where: { jti: decoded.jti },
        include: { user: { select: { id: true, email: true, rol: true } } }
      });

      if (!storedToken || storedToken.isRevoked) {
        throw new Error('Token revocado o inválido');
      }

      // Revocar el token actual
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true }
      });

      // Generar un nuevo par de tokens
      return await this.generateTokenPair({
        userId: storedToken.user.id,
        email: storedToken.user.email,
        rol: storedToken.user.rol
      });
    } catch (error) {      
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token de refresco expirado');
      }
      
      console.error('Error refrescando tokens:', error);
      throw new Error('Error refrescando tokens de autenticación');
    }
  }

  /**
   * Revoca todos los tokens de un usuario
   * @param {string} userId - ID del usuario
   * @returns {number} Número de tokens revocados
   */
  async revokeAllUserTokens(userId) {
    try {
      const result = await prisma.refreshToken.updateMany({
        where: {
          userId,
          isRevoked: false
        },
        data: {
          isRevoked: true
        }
      });

      return result.count;
    } catch (error) {
      console.error('Error revocando tokens de usuario:', error);
      throw new Error('Error revocando tokens de usuario');
    }
  }

  /**
   * Verifica un token de acceso
   * @param {string} token - Token de acceso
   * @returns {Object} Payload del token verificado
   */
  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret);
      
      if (decoded.type !== 'access') {
        throw new Error('Tipo de token inválido');
      }
      
      return {
        success: true,
        payload: decoded
      };
    } catch (error) {
      return {
        success: false,
        error: error.name,
        message: error.message || 'Token inválido o expirado'
      };
    }
  }

  /**
   * Limpia tokens expirados de la base de datos
   * @returns {number} Número de tokens eliminados
   */
  async cleanupExpiredTokens() {
    try {
      const result = await prisma.refreshToken.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });

      return result.count;
    } catch (error) {
      console.error('Error limpiando tokens expirados:', error);
      throw new Error('Error limpiando tokens expirados');
    }
  }

  /**
   * Convierte una cadena de expiración a milisegundos
   * @param {string} expiry - Cadena de expiración (ej: '15m', '1h', '7d')
   * @returns {number} Tiempo en milisegundos
   */
  getExpiryTime(expiry) {
    const unit = expiry.charAt(expiry.length - 1);
    const value = parseInt(expiry.slice(0, -1));
    
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 3600 * 1000; // 1 hora por defecto
    }
  }

  /**
   * Genera un hash de un token para almacenamiento seguro
   * @param {string} token - Token a hashear
   * @returns {string} Hash del token
   */
  hashToken(token) {
    return crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
  }
}

export default TokenService;