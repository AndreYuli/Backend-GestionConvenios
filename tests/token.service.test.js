/**
 * @fileoverview Tests para el servicio de tokens y autenticación
 * @description Verifica la funcionalidad del sistema de rotación de tokens
 */

import { TokenService } from '../src/services/token.service.js';
import { AuthService } from '../src/services/auth.service.js';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

// Mock para el cliente Prisma
const mockPrismaClient = {
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
};

// Mock para el módulo jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

// Mock para el logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

describe('TokenService', () => {
  let tokenService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    tokenService = new TokenService(mockPrismaClient, mockLogger);
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_EXPIRATION = '15m';
    process.env.JWT_REFRESH_EXPIRATION = '7d';
  });

  describe('generateTokenPair', () => {
    test('debe generar un par de tokens válidos', async () => {
      // Mock para jwt.sign
      jwt.sign.mockImplementation((payload, secret, options) => {
        if (secret === 'test-secret') return 'mock-access-token';
        if (secret === 'test-refresh-secret') return 'mock-refresh-token';
        return null;
      });

      // Mock para prisma.refreshToken.create
      mockPrismaClient.refreshToken.create.mockResolvedValue({
        id: 1,
        jti: 'test-jti',
        token: 'hashed-token',
        userId: 1,
        expiresAt: new Date(),
        isRevoked: false,
      });

      const user = { id: 1, email: 'test@example.com', role: 'USER' };
      const result = await tokenService.generateTokenPair(user);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(jwt.sign).toHaveBeenCalledTimes(2);
      expect(mockPrismaClient.refreshToken.create).toHaveBeenCalledTimes(1);
    });

    test('debe manejar errores al generar tokens', async () => {
      // Simular un error en la creación del token
      jwt.sign.mockImplementation(() => {
        throw new Error('Error al firmar token');
      });

      const user = { id: 1, email: 'test@example.com', role: 'USER' };
      
      await expect(tokenService.generateTokenPair(user)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    test('debe refrescar un token válido', async () => {
      // Mock para jwt.verify
      jwt.verify.mockImplementation(() => ({
        sub: '1',
        jti: 'test-jti',
        email: 'test@example.com',
        role: 'USER',
      }));

      // Mock para findUnique
      mockPrismaClient.refreshToken.findUnique.mockResolvedValue({
        id: 1,
        jti: 'test-jti',
        token: 'hashed-token',
        userId: 1,
        expiresAt: new Date(Date.now() + 86400000), // 1 día en el futuro
        isRevoked: false,
      });

      // Mock para user.findUnique
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        role: 'USER',
        isActive: true,
      });

      // Mock para jwt.sign para los nuevos tokens
      jwt.sign.mockImplementation((payload, secret, options) => {
        if (secret === 'test-secret') return 'new-access-token';
        if (secret === 'test-refresh-secret') return 'new-refresh-token';
        return null;
      });

      // Mock para refreshToken.update
      mockPrismaClient.refreshToken.update.mockResolvedValue({
        id: 1,
        jti: 'new-test-jti',
        token: 'new-hashed-token',
        userId: 1,
        expiresAt: new Date(),
        isRevoked: false,
      });

      const result = await tokenService.refreshToken('old-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(jwt.verify).toHaveBeenCalledTimes(1);
      expect(mockPrismaClient.refreshToken.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrismaClient.refreshToken.update).toHaveBeenCalledTimes(1);
    });

    test('debe rechazar un token revocado', async () => {
      // Mock para jwt.verify
      jwt.verify.mockImplementation(() => ({
        sub: '1',
        jti: 'test-jti',
        email: 'test@example.com',
        role: 'USER',
      }));

      // Mock para findUnique con token revocado
      mockPrismaClient.refreshToken.findUnique.mockResolvedValue({
        id: 1,
        jti: 'test-jti',
        token: 'hashed-token',
        userId: 1,
        expiresAt: new Date(Date.now() + 86400000),
        isRevoked: true, // Token revocado
      });

      await expect(tokenService.refreshToken('revoked-token')).rejects.toThrow('Token has been revoked');
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    test('debe rechazar un token expirado', async () => {
      // Mock para jwt.verify
      jwt.verify.mockImplementation(() => ({
        sub: '1',
        jti: 'test-jti',
        email: 'test@example.com',
        role: 'USER',
      }));

      // Mock para findUnique con token expirado
      mockPrismaClient.refreshToken.findUnique.mockResolvedValue({
        id: 1,
        jti: 'test-jti',
        token: 'hashed-token',
        userId: 1,
        expiresAt: new Date(Date.now() - 86400000), // 1 día en el pasado
        isRevoked: false,
      });

      await expect(tokenService.refreshToken('expired-token')).rejects.toThrow('Refresh token has expired');
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('revokeAllUserTokens', () => {
    test('debe revocar todos los tokens de un usuario', async () => {
      mockPrismaClient.refreshToken.updateMany.mockResolvedValue({ count: 3 });

      await tokenService.revokeAllUserTokens(1);

      expect(mockPrismaClient.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 1, isRevoked: false },
        data: { isRevoked: true }
      });
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });

  describe('cleanupExpiredTokens', () => {
    test('debe eliminar tokens expirados', async () => {
      mockPrismaClient.refreshToken.deleteMany.mockResolvedValue({ count: 5 });

      await tokenService.cleanupExpiredTokens();

      expect(mockPrismaClient.refreshToken.deleteMany).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('5 tokens expirados eliminados'));
    });
  });
});

describe('Integración AuthService con TokenService', () => {
  let authService;
  let tokenService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    tokenService = new TokenService(mockPrismaClient, mockLogger);
    authService = new AuthService(mockPrismaClient, tokenService, mockLogger);
    
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  test('login debe generar tokens usando TokenService', async () => {
    // Mock para findFirst
    mockPrismaClient.user.findFirst.mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      password: '$2b$10$abcdefghijklmnopqrstuvwxyz', // Hash simulado
      role: 'USER',
      isActive: true,
    });

    // Mock para bcrypt.compare
    jest.spyOn(authService, 'comparePassword').mockResolvedValue(true);

    // Mock para tokenService.generateTokenPair
    jest.spyOn(tokenService, 'generateTokenPair').mockResolvedValue({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    });

    const result = await authService.login('test@example.com', 'password123');

    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(result.accessToken).toBe('mock-access-token');
    expect(result.refreshToken).toBe('mock-refresh-token');
    expect(tokenService.generateTokenPair).toHaveBeenCalledTimes(1);
  });

  test('validateToken debe usar TokenService para verificar tokens', async () => {
    // Mock para tokenService.verifyAccessToken
    jest.spyOn(tokenService, 'verifyAccessToken').mockResolvedValue({
      sub: '1',
      email: 'test@example.com',
      role: 'USER',
      jti: 'test-jti',
    });

    const result = await authService.validateToken('mock-access-token');

    expect(result).toHaveProperty('userId', '1');
    expect(result).toHaveProperty('email', 'test@example.com');
    expect(result).toHaveProperty('role', 'USER');
    expect(result).toHaveProperty('tokenJti', 'test-jti');
    expect(tokenService.verifyAccessToken).toHaveBeenCalledTimes(1);
  });
});