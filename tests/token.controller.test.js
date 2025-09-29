/**
 * @fileoverview Tests para el controlador de tokens
 * @description Verifica los endpoints de la API para gestión de tokens
 */

import request from 'supertest';
import express from 'express';
import { TokenController } from '../src/controllers/token.controller.js';
import { TokenService } from '../src/services/token.service.js';

// Mock para el servicio de tokens
const mockTokenService = {
  refreshToken: jest.fn(),
  revokeToken: jest.fn(),
  revokeAllUserTokens: jest.fn(),
  cleanupExpiredTokens: jest.fn(),
  getActiveSessionsByUserId: jest.fn(),
};

// Mock para el logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

// Mock para el middleware de autenticación
const mockAuthMiddleware = (req, res, next) => {
  req.user = {
    userId: '1',
    email: 'test@example.com',
    role: 'USER',
    tokenJti: 'test-jti',
  };
  next();
};

// Mock para el middleware de autenticación de admin
const mockAdminMiddleware = (req, res, next) => {
  req.user = {
    userId: '1',
    email: 'admin@example.com',
    role: 'ADMIN',
    tokenJti: 'admin-jti',
  };
  next();
};

describe('TokenController', () => {
  let app;
  let tokenController;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Crear instancia del controlador
    tokenController = new TokenController(mockTokenService, mockLogger);
    
    // Configurar la aplicación Express
    app = express();
    app.use(express.json());
    
    // Configurar rutas
    app.post('/api/tokens/refresh', (req, res) => tokenController.refreshToken(req, res));
    app.post('/api/tokens/logout', mockAuthMiddleware, (req, res) => tokenController.logout(req, res));
    app.post('/api/tokens/invalidate-all', mockAuthMiddleware, (req, res) => tokenController.invalidateAllSessions(req, res));
    app.get('/api/tokens/sessions', mockAuthMiddleware, (req, res) => tokenController.getActiveSessions(req, res));
    app.post('/api/tokens/cleanup', mockAdminMiddleware, (req, res) => tokenController.cleanupExpiredTokens(req, res));
  });

  describe('refreshToken', () => {
    test('debe refrescar un token válido', async () => {
      // Mock para tokenService.refreshToken
      mockTokenService.refreshToken.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      const response = await request(app)
        .post('/api/tokens/refresh')
        .send({ refreshToken: 'valid-refresh-token' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('accessToken', 'new-access-token');
      expect(response.body.data).toHaveProperty('refreshToken', 'new-refresh-token');
      expect(mockTokenService.refreshToken).toHaveBeenCalledWith('valid-refresh-token');
    });

    test('debe manejar errores al refrescar un token', async () => {
      // Mock para tokenService.refreshToken con error
      mockTokenService.refreshToken.mockRejectedValue(new Error('Token inválido'));

      const response = await request(app)
        .post('/api/tokens/refresh')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    test('debe rechazar peticiones sin token de refresco', async () => {
      const response = await request(app)
        .post('/api/tokens/refresh')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Se requiere refreshToken');
    });
  });

  describe('logout', () => {
    test('debe cerrar sesión correctamente', async () => {
      // Mock para tokenService.revokeToken
      mockTokenService.revokeToken.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/tokens/logout')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Sesión cerrada correctamente');
      expect(mockTokenService.revokeToken).toHaveBeenCalledWith('test-jti');
    });

    test('debe manejar errores al cerrar sesión', async () => {
      // Mock para tokenService.revokeToken con error
      mockTokenService.revokeToken.mockRejectedValue(new Error('Error al revocar token'));

      const response = await request(app)
        .post('/api/tokens/logout')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('invalidateAllSessions', () => {
    test('debe invalidar todas las sesiones correctamente', async () => {
      // Mock para tokenService.revokeAllUserTokens
      mockTokenService.revokeAllUserTokens.mockResolvedValue({ count: 3 });

      const response = await request(app)
        .post('/api/tokens/invalidate-all')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Todas las sesiones han sido invalidadas');
      expect(mockTokenService.revokeAllUserTokens).toHaveBeenCalledWith('1');
    });

    test('debe manejar errores al invalidar sesiones', async () => {
      // Mock para tokenService.revokeAllUserTokens con error
      mockTokenService.revokeAllUserTokens.mockRejectedValue(new Error('Error al revocar tokens'));

      const response = await request(app)
        .post('/api/tokens/invalidate-all')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getActiveSessions', () => {
    test('debe obtener las sesiones activas correctamente', async () => {
      // Mock para tokenService.getActiveSessionsByUserId
      mockTokenService.getActiveSessionsByUserId.mockResolvedValue([
        {
          id: 1,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
          userAgent: 'Mozilla/5.0',
          ip: '127.0.0.1',
        },
        {
          id: 2,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
          userAgent: 'Chrome/90.0',
          ip: '192.168.1.1',
        },
      ]);

      const response = await request(app)
        .get('/api/tokens/sessions')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(mockTokenService.getActiveSessionsByUserId).toHaveBeenCalledWith('1');
    });

    test('debe manejar errores al obtener sesiones', async () => {
      // Mock para tokenService.getActiveSessionsByUserId con error
      mockTokenService.getActiveSessionsByUserId.mockRejectedValue(new Error('Error al obtener sesiones'));

      const response = await request(app)
        .get('/api/tokens/sessions')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('cleanupExpiredTokens', () => {
    test('debe limpiar tokens expirados correctamente (solo admin)', async () => {
      // Mock para tokenService.cleanupExpiredTokens
      mockTokenService.cleanupExpiredTokens.mockResolvedValue({ count: 5 });

      const response = await request(app)
        .post('/api/tokens/cleanup')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', expect.stringContaining('5 tokens expirados eliminados'));
      expect(mockTokenService.cleanupExpiredTokens).toHaveBeenCalled();
    });

    test('debe manejar errores al limpiar tokens', async () => {
      // Mock para tokenService.cleanupExpiredTokens con error
      mockTokenService.cleanupExpiredTokens.mockRejectedValue(new Error('Error al limpiar tokens'));

      const response = await request(app)
        .post('/api/tokens/cleanup')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});