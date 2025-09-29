/**
 * @fileoverview Controlador de Registro Simplificado para Diagnóstico
 * @description Versión simplificada para identificar el error 500
 */

import { z } from 'zod';

// Esquema de validación simplificado
const simpleRegisterSchema = z.object({
  email: z.string().email('Email inválido').toLowerCase().trim(),
  password: z.string().min(8, 'Contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string(),
  rol: z.enum(['ADMIN', 'GESTOR']).optional().default('GESTOR')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"]
});

/**
 * Controlador de registro simplificado
 */
export const simpleRegister = async (req, res) => {
  console.log('🔍 SIMPLE REGISTER - Iniciando...');
  console.log('📝 Body recibido:', req.body);

  try {
    // Paso 1: Validación básica
    console.log('1️⃣ Validando datos...');
    const validationResult = simpleRegisterSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      console.log('❌ Error de validación:', validationResult.error.issues);
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: validationResult.error.issues
      });
    }

    console.log('✅ Validación exitosa');
    const { email, password, rol } = validationResult.data;

    // Paso 2: Simular creación de usuario (sin BD por ahora)
    console.log('2️⃣ Simulando creación de usuario...');
    
    const mockUser = {
      id: Date.now(),
      email,
      rol,
      createdAt: new Date().toISOString()
    };

    console.log('✅ Usuario mockado creado:', mockUser);

    // Respuesta exitosa
    return res.status(201).json({
      success: true,
      message: 'Registro simulado exitoso',
      data: {
        user: mockUser,
        message: 'Esto es una prueba sin base de datos'
      }
    });

  } catch (error) {
    console.error('💥 ERROR en simple register:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      stack: error.stack
    });
  }
};