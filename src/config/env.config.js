/**
 * @fileoverview Configuración y validación de variables de entorno
 * @description Valida y exporta variables de entorno con valores por defecto seguros
 * @module config/env
 */

import dotenv from 'dotenv';
import { z } from 'zod';

// Cargar variables de entorno desde .env
dotenv.config();

/**
 * Esquema de validación para variables de entorno
 * Proporciona valores por defecto seguros y validación de tipos
 */
const envSchema = z.object({
  // Configuración de Base de Datos
  DATABASE_URL: z.string({
    required_error: 'DATABASE_URL es requerida'
  }),

  // Configuración del Servidor
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Configuración de JWT
  JWT_SECRET: z.string({
    required_error: 'JWT_SECRET es requerida para la seguridad'
  }).min(32, 'JWT_SECRET debe tener al menos 32 caracteres para seguridad adecuada'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Configuración de CORS
  ALLOWED_ORIGINS: z.string().transform(val => val.split(',')),
  CORS_CREDENTIALS: z.coerce.boolean().default(true),
  CORS_MAX_AGE: z.coerce.number().int().positive().default(86400),

  // Configuración de Rate Limiting
  LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000), // 15 minutos
  LOGIN_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(5),

  // Configuración de Bcrypt
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).default(12),
});

/**
 * Validar variables de entorno
 * @throws {Error} Si las variables de entorno no son válidas
 */
function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Error en la validación de variables de entorno:');
    if (error.errors) {
      error.errors.forEach(err => {
        console.error(`- ${err.path.join('.')}: ${err.message}`);
      });
    }
    process.exit(1);
  }
}

// Exportar variables de entorno validadas
const env = validateEnv();

export default env;