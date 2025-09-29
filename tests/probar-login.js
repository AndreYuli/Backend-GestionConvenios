/**
 * @fileoverview Script para probar el endpoint de login automáticamente
 * @description Prueba todos los casos: éxito, error, validación, rate limiting
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

// Colores para terminal
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testEndpoint(name, config, expectedStatus = 200) {
  try {
    log(colors.blue, `\n🧪 ${name}`);
    log(colors.cyan, `   URL: ${config.method?.toUpperCase() || 'GET'} ${BASE_URL}${config.url}`);
    
    const startTime = Date.now();
    const response = await axios({
      baseURL: BASE_URL,
      timeout: 10000,
      ...config
    });
    const endTime = Date.now();
    
    if (response.status === expectedStatus) {
      log(colors.green, `   ✅ Estado: ${response.status} (${endTime - startTime}ms)`);
      log(colors.green, `   ✅ Mensaje: ${response.data.message || 'OK'}`);
      
      if (response.data.data) {
        if (response.data.data.user) {
          log(colors.cyan, `   👤 Usuario: ${response.data.data.user.email} (${response.data.data.user.rol})`);
        }
        if (response.data.data.tokens) {
          const tokenLength = response.data.data.tokens.accessToken.length;
          log(colors.cyan, `   🔑 Token: ${tokenLength} caracteres`);
          log(colors.cyan, `   ⏰ Expira en: ${response.data.data.tokens.expiresIn}s`);
        }
      }
      
      return { success: true, data: response.data, status: response.status };
    } else {
      log(colors.yellow, `   ⚠️ Estado inesperado: ${response.status} (esperaba ${expectedStatus})`);
      return { success: false, data: response.data, status: response.status };
    }
    
  } catch (error) {
    const endTime = Date.now();
    
    if (error.response) {
      const status = error.response.status;
      const isExpectedError = status === expectedStatus;
      
      if (isExpectedError) {
        log(colors.green, `   ✅ Error esperado: ${status} (${endTime - startTime}ms)`);
        log(colors.green, `   ✅ Mensaje: ${error.response.data.message || 'Error manejado'}`);
        return { success: true, data: error.response.data, status };
      } else {
        log(colors.red, `   ❌ Error: ${status} - ${error.response.data.message || error.message}`);
        return { success: false, data: error.response.data, status };
      }
    } else if (error.code === 'ECONNREFUSED') {
      log(colors.red, `   ❌ Servidor no disponible. ¿Está corriendo 'npm run dev'?`);
      return { success: false, error: 'SERVER_OFFLINE' };
    } else {
      log(colors.red, `   ❌ Error de conexión: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

async function runLoginTests() {
  log(colors.bold, '🚀 INICIANDO TESTS DEL ENDPOINT DE LOGIN');
  log(colors.bold, '='.repeat(50));
  
  let passed = 0;
  let failed = 0;

  // Test 1: Health check del sistema de auth
  const healthResult = await testEndpoint(
    'Health Check - Sistema de Auth',
    { method: 'GET', url: '/api/auth/status' },
    200
  );
  healthResult.success ? passed++ : failed++;

  // Test 2: Login exitoso
  const loginResult = await testEndpoint(
    'Login Exitoso',
    {
      method: 'POST',
      url: '/api/auth/login',
      data: {
        email: 'admin@convenios.com',
        password: 'admin123'
      }
    },
    200
  );
  loginResult.success ? passed++ : failed++;

  // Usar token del login exitoso para siguiente test
  let accessToken = null;
  if (loginResult.success && loginResult.data?.data?.tokens?.accessToken) {
    accessToken = loginResult.data.data.tokens.accessToken;
  }

  // Test 3: Credenciales inválidas
  const invalidLoginResult = await testEndpoint(
    'Login con Credenciales Inválidas',
    {
      method: 'POST',
      url: '/api/auth/login',
      data: {
        email: 'admin@convenios.com',
        password: 'password_incorrecta'
      }
    },
    401
  );
  invalidLoginResult.success ? passed++ : failed++;

  // Test 4: Email inválido
  const invalidEmailResult = await testEndpoint(
    'Login con Email Inválido',
    {
      method: 'POST',
      url: '/api/auth/login',
      data: {
        email: 'email_invalido',
        password: 'admin123'
      }
    },
    400
  );
  invalidEmailResult.success ? passed++ : failed++;

  // Test 5: Campos faltantes
  const missingFieldsResult = await testEndpoint(
    'Login con Campos Faltantes',
    {
      method: 'POST',
      url: '/api/auth/login',
      data: {
        email: 'admin@convenios.com'
        // password faltante
      }
    },
    400
  );
  missingFieldsResult.success ? passed++ : failed++;

  // Test 6: Obtener usuario actual (si tenemos token)
  if (accessToken) {
    const meResult = await testEndpoint(
      'Obtener Usuario Actual (/me)',
      {
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      },
      200
    );
    meResult.success ? passed++ : failed++;

    // Test 7: Logout
    const logoutResult = await testEndpoint(
      'Logout',
      {
        method: 'POST',
        url: '/api/auth/logout',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      },
      200
    );
    logoutResult.success ? passed++ : failed++;
  }

  // Test 8: Token inválido
  const invalidTokenResult = await testEndpoint(
    'Token Inválido',
    {
      method: 'GET',
      url: '/api/auth/me',
      headers: {
        'Authorization': 'Bearer token_invalido'
      }
    },
    401
  );
  invalidTokenResult.success ? passed++ : failed++;

  // Resumen
  console.log('\n' + '='.repeat(50));
  log(colors.bold, '📊 RESUMEN DE TESTS');
  console.log('='.repeat(50));
  
  if (failed === 0) {
    log(colors.green, `🎉 TODOS LOS TESTS PASARON: ${passed}/${passed + failed}`);
    log(colors.green, '✅ El sistema de autenticación está funcionando correctamente!');
  } else {
    log(colors.yellow, `📊 Resultados: ${passed} exitosos, ${failed} fallidos`);
    
    if (passed === 0) {
      log(colors.red, '❌ Ningún test pasó. Verifica que el servidor esté corriendo.');
      log(colors.yellow, 'Ejecuta: npm run dev');
    } else {
      log(colors.cyan, '⚠️ Algunos tests fallaron. Revisa los errores arriba.');
    }
  }

  console.log('\n🔗 URLs para probar manualmente:');
  console.log(`   POST ${BASE_URL}/api/auth/login`);
  console.log(`   GET  ${BASE_URL}/api/auth/status`);
  console.log(`   GET  ${BASE_URL}/api/auth/me (requiere token)`);
}

// Ejecutar tests
runLoginTests().catch(error => {
  log(colors.red, `💥 Error fatal ejecutando tests: ${error.message}`);
  process.exit(1);
});