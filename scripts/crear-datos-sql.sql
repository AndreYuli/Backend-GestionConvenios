-- Script SQL para crear datos de prueba rápidamente
-- Conectar a PostgreSQL y ejecutar:

-- Crear algunos convenios de prueba
INSERT INTO "Convenio" (nombre, descripcion, "fechaInicio", "fechaFin", estado, "createdAt", "updatedAt") VALUES
('Convenio Académico 2025', 'Intercambio estudiantil', '2025-01-15', '2025-12-15', 'Activo', NOW(), NOW()),
('Convenio Comercial Tech', 'Prácticas profesionales', '2025-03-01', '2025-11-30', 'Activo', NOW(), NOW()),
('Convenio Investigación', 'Proyecto biotecnología', '2025-06-01', '2026-05-31', 'Borrador', NOW(), NOW()),
('Convenio Cultural', 'Intercambio cultural', '2025-08-01', '2025-12-31', 'Borrador', NOW(), NOW()),
('Convenio Histórico', 'Proyecto finalizado', '2024-01-01', '2024-12-31', 'Finalizado', NOW(), NOW());

-- Verificar datos creados
SELECT id, nombre, estado, "fechaInicio" FROM "Convenio";