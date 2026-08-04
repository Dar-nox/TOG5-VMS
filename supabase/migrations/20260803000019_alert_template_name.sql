-- The alerts list expects the item name under the name it already reads.
--
-- The view called it template_name, which the client turns into templateName,
-- but every screen showing an alert reads maintenanceTemplateName. The alert
-- still appeared — with a generic heading instead of "Engine Oil Change",
-- which is the detail that makes an alert worth reading at all.
--
-- Added alongside rather than renamed: dashboard_overview already reads
-- template_name from this view, and a rename would break it at the point
-- somebody opened the dashboard rather than here where it could be caught.

create or replace view public.alerts_detailed as
  select
    a.*,
    v.vehicle_name,
    t.name as template_name,
    t.name as maintenance_template_name
  from public.alerts a
  left join public.vehicles v on v.id = a.vehicle_id
  left join public.maintenance_schedules s on s.id = a.maintenance_schedule_id
  left join public.maintenance_templates t on t.id = s.template_id
  where a.deleted_at is null;
