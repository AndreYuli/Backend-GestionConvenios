/**
 * @fileoverview Tests para el middleware de autenticación
 * @description Verifica la funcionalidad del middleware de autenticación con el nuevo sistema de tokens
 */

import { AuthMiddlewareFactory } from '../src/middleware/auth.middleware.js';
import { TokenService } from '../src/services/token.service.js';

// Mock para el servicio de tokens
const mockTokenService = {
  verifyAccessToken: jest.fn(),
  revokeToken: jest.fn(),
};

// Mock para el cliente Prisma
const mockPrismaClient = {
  user: {
    findUnique: jest.fn(),
  },
};

// Mock para el logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

describe('AuthMiddleware', () => {
  let authMiddleware;
  let req;
  let res;
  let next;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Crear instancia del middleware
    authMiddleware = new AuthMiddlewareFactory(mockTokenService, mockPrismaClient, mockLogger);
    
    // Mock para req, res y next
    req = {
      headers: {},
      user: null,
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    
    next = jest.fn();
  });

  describe('authenticate', () => {
    test('debe autenticar correctamente con token válido', async () => {
      // Configurar req con token
      req.headers.authorization = 'Bearer valid-token';
      
      // Mock para tokenService.verifyAccessToken
      mockTokenService.verifyAccessToken.mockResolvedValue({
        sub: '1',
        email: 'test@example.com',
        role: 'USER',
        jti: 'test-jti',
      });
      
      // Ejecutar middleware
      await authMiddleware.authenticate()(req, res, next);
      
      // Verificar que next fue llamado
      expect(next).toHaveBeenCalled();
      
      // Verificar que req.user fue configurado correctamente
      expect(req.user).toEqual({
        userId: '1',
        email: 'test@example.com',
        role: 'USER',
        tokenJti: 'test-jti',
      });
      
      // Verificar que tokenService.verifyAccessToken fue llamado
      expect(mockTokenService.verifyAccessToken).toHaveBeenCalledWith('valid-token');
    });

    test('debe rechazar peticiones sin token', async () => {
      // Ejecutar middleware sin token
      await authMiddleware.authenticate()(req, res, next);
      
      // Verificar que next no fue llamado
      expect(next).not.toHaveBeenCalled();
      
      // Verificar respuesta de error
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'No se proporcionó token de autenticación',
      });
    });

    test('debe rechazar token inválido', async () => {
      // Configurar req con token
      req.headers.authorization = 'Bearer invalid-token';
      
      // Mock para tokenService.verifyAccessToken con error
      mockTokenService.verifyAccessToken.mockRejectedValue(new Error('Token inválido'));
      
      // Ejecutar middleware
      await authMiddleware.authenticate()(req, res, next);
      
      // Verificar que next no fue llamado
      expect(next).not.toHaveBeenCalled();
      
      // Verificar respuesta de error
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token inválido',
      });
      
      // Verificar que se registró el error
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('authorize', () => {
    test('debe autorizar usuario con rol correcto', async () => {
      // Configurar req.user
      req.user = {
        userId: '1',
        email: 'test@example.com',
        role: 'ADMIN',
        tokenJti: 'test-jti',
      };
      
      // Ejecutar middleware
      await authMiddleware.authorize(['ADMIN', 'SUPER_ADMIN'])(req, res, next);
      
      // Verificar que next fue llamado
      expect(next).toHaveBeenCalled();
    });

    test('debe rechazar usuario con rol incorrecto', async () => {
      // Configurar req.user con rol insuficiente
      req.user = {
        userId: '1',
        email: 'test@example.com',
        role: 'USER',
        tokenJti: 'test-jti',
      };
      
      // Ejecutar middleware
      await authMiddleware.authorize(['ADMIN', 'SUPER_ADMIN'])(req, res, next);
      
      // Verificar que next no fue llamado
      expect(next).not.toHaveBeenCalled();
      
      // Verificar respuesta de error
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'No tiene permisos para acceder a este recurso',
      });
    });

    test('debe rechazar peticiones sin autenticación previa', async () => {
      // Ejecutar middleware sin req.user
      await authMiddleware.authorize(['ADMIN'])(req, res, next);
      
      // Verificar que next no fue llamado
      expect(next).not.toHaveBeenCalled();
      
      // Verificar respuesta de error
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Se requiere autenticación',
      });
    });
  });

  describe('validateActiveUser', () => {
    test('debe permitir usuario activo', async () => {
      // Configurar req.user
      req.user = {
        userId: '1',
        email: 'test@example.com',
        role: 'USER',
        tokenJti: 'test-jti',
      };
      
      // Mock para prisma.user.findUnique
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        isActive: true,
      });
      
      // Ejecutar middleware
      await authMiddleware.validateActiveUser()(req, res, next);
      
      // Verificar que next fue llamado
      expect(next).toHaveBeenCalled();
    });

    test('debe rechazar usuario inactivo y revocar tokens', async () => {
      // Configurar req.user
      req.user = {
        userId: '1',
        email: 'test@example.com',
        role: 'USER',
        tokenJti: 'test-jti',
      };
      
      // Mock para prisma.user.findUnique con usuario inactivo
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        isActive: false,
      });
      
      // Ejecutar middleware
      await authMiddleware.validateActiveUser()(req, res, next);
      
      // Verificar que next no fue llamado
      expect(next).not.toHaveBeenCalled();
      
      // Verificar respuesta de error
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Usuario inactivo',
      });
      
      // Verificar que se revocaron los tokens
      expect(mockTokenService.revokeAllUserTokens).toHaveBeenCalledWith('1');
    });

    test('debe manejar errores al validar usuario', async () => {
      // Configurar req.user
      req.user = {
        userId: '1',
        email: 'test@example.com',
        role: 'USER',
        tokenJti: 'test-jti',
      };
      
      // Mock para prisma.user.findUnique con error
      mockPrismaClient.user.findUnique.mockRejectedValue(new Error('Error al buscar usuario'));
      
      // Ejecutar middleware
      await authMiddleware.validateActiveUser()(req, res, next);
      
      // Verificar que next no fue llamado
      expect(next).not.toHaveBeenCalled();
      
      // Verificar respuesta de error
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Error al validar usuario',
      });
      
      // Verificar que se registró el error
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});