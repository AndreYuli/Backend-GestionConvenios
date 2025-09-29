/**
 * @fileoverview Script para crear usuario de prueba con password hasheado
 * @description Crea usuario administrador para testing del sistema de auth
 */

import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log('🚀 Creando usuario de prueba para login...\n');

    // Hash de la contraseña con bcrypt (salt rounds = 12 para seguridad)
    const password = 'admin123';
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Crear usuario de prueba
    const user = await prisma.user.create({
      data: {
        email: 'admin@convenios.com',
        password: hashedPassword,
        rol: 'ADMIN',
        isActive: true
      },
      select: {
        id: true,
        email: true,
        rol: true,
        isActive: true,
        createdAt: true
      }
    });

    console.log('✅ Usuario de prueba creado exitosamente:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Rol: ${user.rol}`);
    console.log(`   Activo: ${user.isActive}`);
    console.log(`   Creado: ${user.createdAt.toLocaleString()}`);

    console.log('\n🔐 CREDENCIALES PARA TESTING:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: ${password}`);

    console.log('\n🎯 PRUEBA EL LOGIN CON:');
    console.log('   POST http://localhost:3000/api/auth/login');
    console.log('   Body: {');
    console.log(`     "email": "${user.email}",`);
    console.log(`     "password": "${password}"`);
    console.log('   }');

    console.log('\n✅ ¡Usuario listo para pruebas!');

  } catch (error) {
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      console.log('⚠️ El usuario ya existe. Intentando actualizar...');
      
      try {
        const hashedPassword = await bcrypt.hash('admin123', 12);
        const updatedUser = await prisma.user.update({
          where: { email: 'admin@convenios.com' },
          data: { 
            password: hashedPassword,
            isActive: true,
            updatedAt: new Date()
          },
          select: {
            id: true,
            email: true,
            rol: true,
            isActive: true
          }
        });

        console.log('✅ Usuario actualizado exitosamente:');
        console.log(`   ID: ${updatedUser.id}`);
        console.log(`   Email: ${updatedUser.email}`);
        console.log(`   Rol: ${updatedUser.rol}`);
        console.log('\n🔐 Credenciales: admin@convenios.com / admin123');
      } catch (updateError) {
        console.error('❌ Error actualizando usuario:', updateError);
      }
    } else {
      console.error('❌ Error creando usuario de prueba:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();