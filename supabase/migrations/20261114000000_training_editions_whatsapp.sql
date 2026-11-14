-- Migración: Adición de columna whatsapp_group_url a training_editions
-- Identificador: DAOM-LEARNING-MANUAL-ENROLLMENTS-01
-- Fecha: 14 de noviembre de 2026

ALTER TABLE training_editions ADD COLUMN IF NOT EXISTS whatsapp_group_url TEXT;

-- Configurar enlace oficial inicial para la edición SEM-BIOMECANICA
UPDATE training_editions 
SET whatsapp_group_url = 'https://chat.whatsapp.com/H2GeOaYVJx3HWU8ZSgKpsk?s=cl&p=a&iam=2'
WHERE capacitacion_id = 'SEM-BIOMECANICA' AND (whatsapp_group_url IS NULL OR whatsapp_group_url = '');
