ALTER TABLE maintenance_templates
ADD COLUMN template_key TEXT;

CREATE UNIQUE INDEX idx_maintenance_templates_template_key
  ON maintenance_templates(template_key)
  WHERE template_key IS NOT NULL;
