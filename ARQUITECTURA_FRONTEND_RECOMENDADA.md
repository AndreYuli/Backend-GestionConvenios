/**
 * ARQUITECTURA RECOMENDADA PARA FRONTEND
 * Sistema híbrido: Público + Administrativo
 */

// 1. ÁREA PÚBLICA (Sin autenticación) - Para Estudiantes
const publicRoutes = [
  '/',                    // Página principal
  '/convenios',           // Lista de convenios
  '/convenio/:id',        // Detalle de convenio
  '/buscar',             // Buscador de convenios
  '/categorias',         // Convenios por categoría
  '/universidades',      // Convenios por universidad
];

// 2. ÁREA ADMINISTRATIVA (Con autenticación) - Para Staff
const adminRoutes = [
  '/admin/login',        // Login administrativo
  '/admin/dashboard',    // Panel de control
  '/admin/convenios',    // Gestión de convenios
  '/admin/estadisticas', // Reportes y estadísticas
  '/admin/usuarios',     // Gestión de usuarios (solo ADMIN)
];

// 3. CONFIGURACIÓN DE ROLES
const roleConfig = {
  ADMIN: {
    permissions: ['create', 'read', 'update', 'delete', 'manage_users'],
    description: 'Acceso completo al sistema'
  },
  GESTOR: {
    permissions: ['create', 'read', 'update', 'delete'],
    description: 'Gestión de convenios'
  }
};

// 4. ESTRUCTURA DE NAVEGACIÓN SUGERIDA
const navigationStructure = {
  // Header público
  public: {
    logo: 'UNAC Convenios',
    menu: [
      'Inicio',
      'Todos los Convenios', 
      'Por Universidad',
      'Por Área de Estudio',
      'Buscar'
    ],
    rightSide: 'Admin Login' // Botón discreto para personal
  },
  
  // Panel administrativo
  admin: {
    sidebar: [
      'Dashboard',
      'Gestionar Convenios',
      'Estadísticas',
      'Configuración',
      'Usuarios' // Solo para ADMIN
    ]
  }
};