/**
 * @fileoverview Validadores para parámetros de consulta de Convenios
 * @description Implementa validaciones optimizadas usando Zod con patrones de diseño
 * @author Tu Nombre
 * @version 1.0.0
 * 
 * Patrones implementados:
 * - Chain of Responsibility: Validaciones encadenadas
 * - Decorator Pattern: Validaciones adicionales
 * - Factory Pattern: Creación de validadores específicos
 * 
 * Complejidad Big O:
 * - Validaciones simples: O(1)
 * - Validaciones de arrays: O(n) donde n = elementos del array
 * - Validaciones de fechas: O(1)
 * - Validaciones complejas: O(k) donde k = número de reglas
 */

import { z } from 'zod';

/**
 * @class ValidationFactory
 * @description Factory pattern para crear validadores específicos
 */
class ValidationFactory {
  /**
   * Validador para estados de convenio - O(1)
   */
  static createEstadoValidator() {
    return z.enum(['Borrador', 'Activo', 'Finalizado', 'Archivado'], {
      errorMap: () => ({ message: 'Estado debe ser: Borrador, Activo, Finalizado o Archivado' })
    });
  }

  /**
   * Validador para fechas - O(1)
   */
  static createDateValidator() {
    return z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha debe ser YYYY-MM-DD')
      .refine((date) => {
        const parsed = new Date(date);
        return !isNaN(parsed.getTime()) && parsed.getFullYear() >= 2000;
      }, 'Fecha debe ser válida y posterior al año 2000');
  }

  /**
   * Validador para texto de búsqueda - O(1)
   */
  static createSearchTextValidator() {
    return z.string()
      .min(2, 'Texto de búsqueda debe tener al menos 2 caracteres')
      .max(100, 'Texto de búsqueda no puede exceder 100 caracteres')
      .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-_.]+$/, 'Texto contiene caracteres no válidos');
  }

  /**
   * Validador para paginación - O(1)
   */
  static createPaginationValidator() {
    return z.object({
      page: z.coerce.number()
        .int('Página debe ser un número entero')
        .min(1, 'Página debe ser mayor a 0')
        .max(10000, 'Página no puede exceder 10000')
        .default(1),
      limit: z.coerce.number()
        .int('Límite debe ser un número entero')
        .min(1, 'Límite debe ser mayor a 0')
        .max(100, 'Límite no puede exceder 100 registros')
        .default(10)
    });
  }

  /**
   * Validador para ordenamiento - O(1)
   */
  static createSortValidator() {
    return z.object({
      sortBy: z.enum(['nombre', 'fechaInicio', 'fechaFin', 'createdAt', 'updatedAt'], {
        errorMap: () => ({ message: 'Campo de ordenamiento no válido' })
      }).default('createdAt'),
      sortOrder: z.enum(['asc', 'desc'], {
        errorMap: () => ({ message: 'Orden debe ser asc o desc' })
      }).default('desc')
    });
  }
}

/**
 * @class QueryParamsValidator
 * @description Chain of Responsibility pattern para validaciones encadenadas
 */
class QueryParamsValidator {
  constructor() {
    this.validators = [];
  }

  /**
   * Agregar validador a la cadena - O(1)
   */
  addValidator(validator) {
    this.validators.push(validator);
    return this;
  }

  /**
   * Ejecutar cadena de validaciones - O(k) donde k = número de validadores
   */
  async validate(data) {
    let result = { ...data };
    const errors = [];

    for (const validator of this.validators) {
      try {
        result = await validator.parseAsync(result);
      } catch (error) {
        if (error instanceof z.ZodError) {
          errors.push(...error.errors);
        } else {
          errors.push({ message: error.message });
        }
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Errores de validación', errors);
    }

    return result;
  }
}

/**
 * @class ValidationError
 * @description Error personalizado para validaciones
 */
class ValidationError extends Error {
  constructor(message, errors) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
    this.isValidationError = true;
  }
}

/**
 * Schema principal para consulta de convenios
 * Complejidad: O(k) donde k = número de parámetros a validar
 */
const conveniosQuerySchema = z.object({
  // Filtro por estado único - O(1)
  estado: ValidationFactory.createEstadoValidator().optional(),

  // Filtro por múltiples estados - O(n) donde n = número de estados
  estados: z.union([
    z.string().transform(str => str.split(',')),
    z.array(z.string())
  ])
    .optional()
    .refine((estados) => {
      if (!estados) return true;
      const validEstados = ['Borrador', 'Activo', 'Finalizado', 'Archivado'];
      return estados.every(estado => validEstados.includes(estado));
    }, 'Uno o más estados no son válidos'),

  // Filtros de fecha - O(1) cada uno
  fechaInicio: ValidationFactory.createDateValidator().optional(),
  fechaFin: ValidationFactory.createDateValidator().optional(),

  // Búsqueda de texto - O(1)
  busqueda: ValidationFactory.createSearchTextValidator().optional(),

  // Incluir relaciones - O(1)
  includePartes: z.coerce.boolean().default(false),

  // Paginación - O(1)
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),

  // Ordenamiento - O(1)
  sortBy: z.enum(['nombre', 'fechaInicio', 'fechaFin', 'createdAt', 'updatedAt'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})
.refine((data) => {
  // Validación de rango de fechas - O(1)
  if (data.fechaInicio && data.fechaFin) {
    const inicio = new Date(data.fechaInicio);
    const fin = new Date(data.fechaFin);
    return inicio <= fin;
  }
  return true;
}, {
  message: 'La fecha de inicio debe ser anterior o igual a la fecha de fin',
  path: ['fechaFin']
});

/**
 * Schema para búsqueda avanzada
 * Complejidad: O(k) donde k = número de criterios
 */
const advancedSearchSchema = z.object({
  textSearch: ValidationFactory.createSearchTextValidator().optional(),
  
  estados: z.array(ValidationFactory.createEstadoValidator())
    .min(1, 'Debe especificar al menos un estado')
    .max(4, 'No puede especificar más de 4 estados')
    .optional(),

  fechaDesde: ValidationFactory.createDateValidator().optional(),
  fechaHasta: ValidationFactory.createDateValidator().optional(),

  incluirPartes: z.boolean().default(false),

  ordenarPor: z.enum(['nombre', 'fechaInicio', 'fechaFin', 'createdAt', 'updatedAt'])
    .default('createdAt'),
  orden: z.enum(['asc', 'desc']).default('desc'),

  pagina: z.number().int().min(1).max(10000).default(1),
  limite: z.number().int().min(1).max(100).default(20)
})
.refine((data) => {
  // Validación de consistencia de fechas - O(1)
  if (data.fechaDesde && data.fechaHasta) {
    return new Date(data.fechaDesde) <= new Date(data.fechaHasta);
  }
  return true;
}, {
  message: 'fechaDesde debe ser anterior o igual a fechaHasta',
  path: ['fechaHasta']
});

/**
 * Schema para validar ID de convenio
 * Complejidad: O(1)
 */
const convenioIdSchema = z.object({
  id: z.coerce.number()
    .int('ID debe ser un número entero')
    .positive('ID debe ser positivo')
    .max(2147483647, 'ID excede el valor máximo permitido'),
  
  includePartes: z.coerce.boolean().default(false)
});

/**
 * @namespace ValidatorMiddlewares
 * @description Middlewares de validación para Express
 */

/**
 * Middleware para validar parámetros de consulta de convenios
 * Complejidad: O(k) donde k = número de parámetros
 */
export const validateConveniosQuery = async (req, res, next) => {
  try {
    // Crear instancia del validador con patrón Chain of Responsibility
    const validator = new QueryParamsValidator()
      .addValidator(conveniosQuerySchema);

    // Validar parámetros - O(k)
    const validatedQuery = await validator.validate(req.query);
    
    // Asignar parámetros validados
    req.validatedQuery = validatedQuery;
    
    next();
  } catch (error) {
    if (error.isValidationError) {
      return res.status(400).json({
        success: false,
        message: 'Parámetros de consulta inválidos',
        errors: error.errors,
        timestamp: new Date().toISOString(),
        performance: {
          validationComplexity: 'O(k)',
          optimizations: ['early_validation', 'schema_caching']
        }
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error interno de validación',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Middleware para validar ID de convenio
 * Complejidad: O(1)
 */
export const validateConvenioId = async (req, res, next) => {
  try {
    const validatedParams = await convenioIdSchema.parseAsync({
      ...req.params,
      ...req.query
    });
    
    req.validatedParams = validatedParams;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'ID de convenio inválido',
        errors: error.errors,
        timestamp: new Date().toISOString(),
        performance: {
          validationComplexity: 'O(1)'
        }
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error interno de validación',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Middleware para validar búsqueda avanzada
 * Complejidad: O(k) donde k = número de criterios
 */
export const validateAdvancedSearch = async (req, res, next) => {
  try {
    const validatedBody = await advancedSearchSchema.parseAsync(req.body);
    
    req.validatedBody = validatedBody;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Criterios de búsqueda inválidos',
        errors: error.errors,
        timestamp: new Date().toISOString(),
        performance: {
          validationComplexity: 'O(k)'
        }
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error interno de validación',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Validador de propósito general para queries complejas
 * Complejidad: O(k * n) donde k = reglas, n = elementos por regla
 */
export const createCustomValidator = (schema, errorMessage = 'Datos inválidos') => {
  return async (req, res, next) => {
    try {
      const validatedData = await schema.parseAsync({
        ...req.query,
        ...req.params,
        ...req.body
      });
      
      req.validatedData = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: errorMessage,
          errors: error.errors,
          timestamp: new Date().toISOString()
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Error interno de validación',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };
};

// Exportar clases y schemas para testing
export {
  ValidationFactory,
  QueryParamsValidator,
  ValidationError,
  conveniosQuerySchema,
  advancedSearchSchema,
  convenioIdSchema
};
