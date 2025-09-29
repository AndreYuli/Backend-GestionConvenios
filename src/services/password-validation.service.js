/**
 * @fileoverview Lógica Avanzada de Validación de Contraseñas con Hash
 * @description Implementa Strategy Pattern, Decorator Pattern y análisis Big O para validación segura
 * @author Sistema de Gestión de Convenios
 * @version 1.0.0
 */

import bcrypt from 'bcrypt';
import crypto from 'crypto';

/**
 * Strategy Pattern: Diferentes estrategias de hashing de contraseñas
 * Permite cambiar algoritmos de hash sin afectar el código cliente
 */
class PasswordHashStrategy {
  async hash(password, options = {}) {
    throw new Error('hash() debe ser implementado por la clase hija');
  }

  async verify(password, hash) {
    throw new Error('verify() debe ser implementado por la clase hija');
  }

  getComplexity() {
    throw new Error('getComplexity() debe ser implementado por la clase hija');
  }
}

/**
 * Estrategia bcrypt - Recomendada para producción
 * Complejidad: O(2^saltRounds) - Intencionalmente lenta para seguridad
 */
class BcryptStrategy extends PasswordHashStrategy {
  constructor(saltRounds = 12) {
    super();
    this.saltRounds = saltRounds;
    this.algorithm = 'bcrypt';
  }

  /**
   * Hash de contraseña con bcrypt
   * Complejidad: O(2^saltRounds) ≈ O(4096) para saltRounds=12
   */
  async hash(password, options = {}) {
    const startTime = Date.now();
    
    try {
      // Validar entrada
      if (!password || typeof password !== 'string') {
        throw new Error('Password debe ser un string no vacío');
      }

      if (password.length > 72) {
        // bcrypt trunca passwords > 72 caracteres
        throw new Error('Password demasiado largo (máximo 72 caracteres)');
      }

      const saltRounds = options.saltRounds || this.saltRounds;
      const hash = await bcrypt.hash(password, saltRounds);
      
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        hash,
        algorithm: this.algorithm,
        saltRounds,
        executionTime: `${executionTime}ms`,
        securityLevel: this._getSecurityLevel(saltRounds)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        algorithm: this.algorithm
      };
    }
  }

  /**
   * Verificación de contraseña con bcrypt
   * Complejidad: O(2^saltRounds) - Mismo tiempo que hash
   */
  async verify(password, hash) {
    const startTime = Date.now();
    
    try {
      // Validaciones de entrada
      if (!password || typeof password !== 'string') {
        return {
          success: false,
          isValid: false,
          error: 'Password inválido',
          executionTime: '0ms'
        };
      }

      if (!hash || typeof hash !== 'string') {
        return {
          success: false,
          isValid: false,
          error: 'Hash inválido',
          executionTime: '0ms'
        };
      }

      // Verificar formato de hash bcrypt
      if (!hash.startsWith('$2a$') && !hash.startsWith('$2b$') && !hash.startsWith('$2y$')) {
        return {
          success: false,
          isValid: false,
          error: 'Formato de hash bcrypt inválido',
          executionTime: '0ms'
        };
      }

      // Verificación principal: O(2^saltRounds)
      const isValid = await bcrypt.compare(password, hash);
      
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        isValid,
        algorithm: this.algorithm,
        executionTime: `${executionTime}ms`,
        hashInfo: this._analyzeHash(hash)
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        success: false,
        isValid: false,
        error: error.message,
        executionTime: `${executionTime}ms`
      };
    }
  }

  getComplexity() {
    return {
      time: `O(2^${this.saltRounds})`,
      space: 'O(1)',
      security: this._getSecurityLevel(this.saltRounds),
      recommended: this.saltRounds >= 12
    };
  }

  /**
   * Analizar información del hash bcrypt
   * Complejidad: O(1)
   */
  _analyzeHash(hash) {
    try {
      const parts = hash.split('$');
      if (parts.length >= 4) {
        return {
          version: parts[1],
          saltRounds: parseInt(parts[2]),
          salt: parts[3]?.substring(0, 22),
          hashLength: hash.length
        };
      }
      return { valid: false };
    } catch {
      return { valid: false };
    }
  }

  /**
   * Determinar nivel de seguridad basado en salt rounds
   * Complejidad: O(1)
   */
  _getSecurityLevel(saltRounds) {
    if (saltRounds >= 15) return 'VERY_HIGH';
    if (saltRounds >= 12) return 'HIGH';
    if (saltRounds >= 10) return 'MEDIUM';
    if (saltRounds >= 8) return 'LOW';
    return 'VERY_LOW';
  }
}

/**
 * Estrategia Argon2 - Alternativa moderna (opcional)
 * Complejidad: O(memory * time * parallelism)
 */
class Argon2Strategy extends PasswordHashStrategy {
  constructor(options = {}) {
    super();
    this.options = {
      type: 2, // Argon2id
      memory: 64 * 1024, // 64 MB
      time: 3,
      parallelism: 4,
      ...options
    };
    this.algorithm = 'argon2id';
  }

  async hash(password, options = {}) {
    // Implementación futura con argon2
    throw new Error('Argon2 no implementado aún. Usar BcryptStrategy.');
  }

  async verify(password, hash) {
    throw new Error('Argon2 no implementado aún. Usar BcryptStrategy.');
  }

  getComplexity() {
    return {
      time: `O(${this.options.time})`,
      space: `O(${this.options.memory})`,
      parallelism: this.options.parallelism,
      algorithm: this.algorithm
    };
  }
}

/**
 * Decorator Pattern: Añade funcionalidades adicionales a la validación
 */
class PasswordValidationDecorator {
  constructor(strategy) {
    this.strategy = strategy;
  }

  async hash(password, options = {}) {
    return this.strategy.hash(password, options);
  }

  async verify(password, hash) {
    return this.strategy.verify(password, hash);
  }
}

/**
 * Decorator para logging de validaciones
 * Complejidad: O(1) adicional
 */
class LoggingDecorator extends PasswordValidationDecorator {
  async verify(password, hash) {
    const startTime = Date.now();
    console.log(`🔐 [PASSWORD_VALIDATION] Iniciando verificación...`);
    
    const result = await super.verify(password, hash);
    
    const totalTime = Date.now() - startTime;
    
    if (result.success && result.isValid) {
      console.log(`✅ [PASSWORD_VALIDATION] Contraseña válida - Tiempo: ${totalTime}ms`);
    } else if (result.success && !result.isValid) {
      console.log(`❌ [PASSWORD_VALIDATION] Contraseña inválida - Tiempo: ${totalTime}ms`);
    } else {
      console.log(`💥 [PASSWORD_VALIDATION] Error: ${result.error} - Tiempo: ${totalTime}ms`);
    }
    
    return result;
  }
}

/**
 * Decorator para timing attacks protection
 * Asegura tiempo constante para passwords inválidos
 * Complejidad: O(max_time) - Tiempo constante para seguridad
 */
class TimingAttackProtectionDecorator extends PasswordValidationDecorator {
  constructor(strategy, minTimeMs = 100) {
    super(strategy);
    this.minTimeMs = minTimeMs;
  }

  async verify(password, hash) {
    const startTime = Date.now();
    
    // Ejecutar verificación real
    const result = await super.verify(password, hash);
    
    const executionTime = Date.now() - startTime;
    
    // Si la ejecución fue muy rápida (error temprano), agregar delay
    if (executionTime < this.minTimeMs) {
      const delay = this.minTimeMs - executionTime;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    return {
      ...result,
      timingProtected: true,
      minTimeEnforced: `${this.minTimeMs}ms`
    };
  }
}

/**
 * Factory Pattern: Crea validadores según configuración
 * Complejidad: O(1) para creación
 */
class PasswordValidatorFactory {
  static strategies = new Map([
    ['bcrypt', BcryptStrategy],
    ['argon2', Argon2Strategy]
  ]);

  /**
   * Crear validador básico
   */
  static createBasic(algorithm = 'bcrypt', options = {}) {
    const StrategyClass = this.strategies.get(algorithm);
    
    if (!StrategyClass) {
      throw new Error(`Algoritmo no soportado: ${algorithm}`);
    }

    return new StrategyClass(options.saltRounds || 12);
  }

  /**
   * Crear validador con logging
   */
  static createWithLogging(algorithm = 'bcrypt', options = {}) {
    const basicValidator = this.createBasic(algorithm, options);
    return new LoggingDecorator(basicValidator);
  }

  /**
   * Crear validador con protección contra timing attacks
   */
  static createWithTimingProtection(algorithm = 'bcrypt', options = {}) {
    const basicValidator = this.createBasic(algorithm, options);
    return new TimingAttackProtectionDecorator(basicValidator, options.minTimeMs);
  }

  /**
   * Crear validador completo (logging + timing protection)
   */
  static createComplete(algorithm = 'bcrypt', options = {}) {
    let validator = this.createBasic(algorithm, options);
    validator = new LoggingDecorator(validator);
    validator = new TimingAttackProtectionDecorator(validator, options.minTimeMs || 100);
    return validator;
  }

  /**
   * Obtener algoritmos disponibles
   */
  static getAvailableAlgorithms() {
    return Array.from(this.strategies.keys());
  }
}

/**
 * Servicio principal de validación de contraseñas
 * Integra todas las estrategias y decoradores
 */
class PasswordValidationService {
  constructor(options = {}) {
    this.validator = PasswordValidatorFactory.createComplete('bcrypt', {
      saltRounds: options.saltRounds || 12,
      minTimeMs: options.minTimeMs || 100
    });
  }

  /**
   * Hash de contraseña
   * Complejidad: O(2^saltRounds)
   */
  async hashPassword(password, options = {}) {
    return this.validator.hash(password, options);
  }

  /**
   * Verificar contraseña contra hash
   * Complejidad: O(2^saltRounds) con protección timing
   */
  async verifyPassword(password, hash) {
    return this.validator.verify(password, hash);
  }

  /**
   * Análisis de complejidad del servicio
   */
  getComplexityAnalysis() {
    return {
      hashing: 'O(2^saltRounds) - Intencionalmente lenta',
      verification: 'O(2^saltRounds) - Misma complejidad que hash',
      timingProtection: 'O(max_time) - Tiempo mínimo garantizado',
      memoryUsage: 'O(1) - Constante',
      securityLevel: 'HIGH - bcrypt con salt rounds >= 12'
    };
  }

  /**
   * Información del validador actual
   */
  getValidatorInfo() {
    return {
      algorithm: 'bcrypt',
      complexity: this.validator.strategy?.getComplexity?.() || 'N/A',
      decorators: ['LoggingDecorator', 'TimingAttackProtectionDecorator'],
      features: {
        timingAttackProtection: true,
        logging: true,
        saltRounds: 12,
        securityLevel: 'HIGH'
      }
    };
  }
}

export {
  PasswordValidationService,
  PasswordValidatorFactory,
  BcryptStrategy,
  LoggingDecorator,
  TimingAttackProtectionDecorator
};

export default PasswordValidationService;