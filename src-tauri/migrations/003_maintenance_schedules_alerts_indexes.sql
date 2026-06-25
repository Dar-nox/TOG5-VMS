CREATE UNIQUE INDEX idx_maintenance_schedules_vehicle_template_live
  ON maintenance_schedules(vehicle_id, template_id)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX idx_alerts_active_schedule_type
  ON alerts(vehicle_id, maintenance_schedule_id, alert_type)
  WHERE status = 'active'
    AND deleted_at IS NULL
    AND maintenance_schedule_id IS NOT NULL;
