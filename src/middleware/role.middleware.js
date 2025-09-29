/**
 * Middleware de autorización por roles
 * Solo para endpoints administrativos
 */

export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    // Si no hay usuario autenticado
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Acceso no autorizado - Se requiere autenticación',
        error: 'UNAUTHORIZED'
      });
    }

    // Si el rol del usuario no está permitido
    if (!allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: `Acceso denegado - Se requiere rol: ${allowedRoles.join(' o ')}`,
        error: 'FORBIDDEN',
        userRole: req.user.rol,
        requiredRoles: allowedRoles
      });
    }

    next();
  };
};

// Ejemplos de uso:
// router.post('/convenios', authMiddleware, requireRole(['ADMIN', 'GESTOR']), createConvenio);
// router.delete('/convenios/:id', authMiddleware, requireRole(['ADMIN']), deleteConvenio);
// router.get('/admin/users', authMiddleware, requireRole(['ADMIN']), getUsers);