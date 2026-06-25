# 04 — Smart Maintenance Template Engine

The maintenance template engine is the most important domain feature in TOG 5 VMS.

The app must not apply the same maintenance checklist to every vehicle. Maintenance tasks must adapt based on vehicle type, fuel type, transmission, drivetrain, and selected features.

## Core Concept

A maintenance template describes a possible task, such as:

- Engine Oil Change
- Spark Plug Replacement
- Diesel Fuel Filter Replacement
- Brake Pad Inspection
- Tire Rotation
- DEF/AdBlue Check

A template becomes active for a vehicle only when its applicability rules match that vehicle.

## Template Status Per Vehicle

A vehicle maintenance setting may have one of these statuses:

1. `active` — applies to this vehicle.
2. `disabled` — user disabled it.
3. `not_applicable` — system or user marked it as not applicable.
4. `manually_added` — user intentionally added it even if rules did not suggest it.

## Applicability Inputs

Rules may check:

1. Vehicle type.
2. Fuel type.
3. Transmission type.
4. Drivetrain.
5. Feature flags.
6. User overrides.

## Fuel Type Rules

### Gasoline

Automatically suggest:

1. Engine oil change.
2. Oil filter replacement.
3. Engine air filter.
4. Fuel filter, if applicable.
5. Spark plug replacement.
6. Ignition coil inspection.
7. Oxygen sensor inspection, if applicable.
8. Catalytic converter inspection.

Do not automatically suggest:

1. Glow plug inspection.
2. DEF/AdBlue check.
3. DPF regeneration check.

### Diesel

Automatically suggest:

1. Engine oil change.
2. Oil filter replacement.
3. Engine air filter.
4. Diesel fuel filter replacement.
5. Water separator service.
6. Glow plug inspection, if applicable.
7. Injector inspection/cleaning.
8. Turbocharger inspection, if equipped.
9. DPF inspection, if equipped.
10. DEF/AdBlue check, if equipped.

Do not automatically suggest:

1. Spark plug replacement.
2. Ignition coil inspection.
3. Distributor maintenance.

### Hybrid Gasoline

Automatically suggest:

1. Gasoline engine maintenance.
2. Hybrid battery health check.
3. Hybrid cooling inspection.
4. Regenerative braking inspection.
5. Inverter coolant check, if applicable.

### Full EV

Automatically suggest:

1. High-voltage battery health check.
2. Charging port inspection.
3. Charging cable inspection.
4. Electric motor inspection.
5. Inverter inspection.
6. Battery cooling inspection.
7. Brake inspection.
8. Tire inspection.
9. Cabin air filter replacement.

Do not automatically suggest:

1. Engine oil change.
2. Spark plug replacement.
3. Fuel filter replacement.
4. Exhaust inspection.
5. Radiator engine cooling tasks unless vehicle has a relevant cooling system.

## Transmission Rules

### Manual

Suggest:

1. Manual transmission gear oil replacement.
2. Clutch inspection.
3. Clutch fluid check, if hydraulic.
4. Clutch pedal adjustment, if applicable.

### Automatic

Suggest:

1. Automatic transmission fluid check.
2. Automatic transmission fluid replacement.
3. Transmission filter replacement, if applicable.
4. Transmission leak inspection.

### CVT

Suggest:

1. CVT fluid replacement.
2. CVT system inspection.
3. Transmission leak inspection.

### DCT

Suggest:

1. DCT fluid replacement.
2. Mechatronic system inspection, if applicable.
3. Clutch adaptation/check, if applicable.

## Drivetrain Rules

### FWD

Suggest as applicable:

1. CV joint inspection.
2. CV boot inspection.
3. Wheel bearing inspection.

### RWD

Suggest:

1. Differential oil replacement.
2. Propeller shaft inspection.
3. Universal joint inspection.

### AWD / 4WD

Suggest:

1. Differential oil replacement.
2. Transfer case fluid replacement.
3. Propeller shaft inspection.
4. Universal joint inspection.
5. CV joint inspection.

## Feature-Based Rules

### Turbocharged

Suggest:

1. Turbocharger inspection.
2. Intercooler hose inspection.
3. Oil leak inspection.

### DEF/AdBlue Equipped

Suggest:

1. DEF/AdBlue level check.
2. DEF/AdBlue refill log.
3. SCR system inspection.

### Diesel Particulate Filter Equipped

Suggest:

1. DPF inspection.
2. DPF regeneration status check.

### Timing Belt

Suggest:

1. Timing belt inspection/replacement.

### Timing Chain

Suggest:

1. Timing chain inspection, if needed.

## Rule Evaluation Approach

Recommended pseudocode:

```text
for each vehicle:
  for each active maintenance template:
    evaluate include rules
    evaluate exclude rules
    evaluate required features
    evaluate excluded features

    if excluded:
      mark not_applicable unless manually overridden
    else if included or universal:
      create or keep active vehicle maintenance setting
    else:
      do not auto-add
```

## Override Warning

If a user manually adds a task that does not normally apply, show a warning but allow them to continue.

Example:

```text
You are adding Spark Plug Replacement to a diesel vehicle.
Diesel vehicles usually do not use spark plugs.
Continue anyway?
```

## Required Default Maintenance Categories

Version 1 must include at least:

1. Oil and filters.
2. Tires and wheels.
3. Brakes.
4. Battery and electrical.
5. Fluids.
6. Cooling system.
7. Belts and hoses.
8. Transmission.
9. Suspension and steering.
10. Legal documents.
11. Gasoline-specific ignition maintenance.
12. Diesel-specific fuel and emissions maintenance.

## Universal Maintenance Templates

Universal safety and condition checks should apply to most vehicles:

1. Tire pressure check.
2. Tire tread depth inspection.
3. Tire rotation, if applicable.
4. Wheel alignment.
5. Wheel balancing.
6. Brake inspection.
7. Brake pad/shoe inspection.
8. Brake rotor/drum inspection.
9. Parking brake inspection.
10. Brake fluid check.
11. Headlight check.
12. Brake light check.
13. Signal light check.
14. Hazard light check.
15. Reverse light check.
16. Horn check.
17. Windshield wiper inspection.
18. Washer fluid refill.
19. Mirror inspection.
20. Seat belt inspection.
21. Dashboard warning light check.
22. Emergency kit inspection.
23. Spare tire inspection.
24. Fluid leak inspection.
25. Underbody inspection.
26. Rust inspection.
27. General roadworthiness inspection.

## Initial Seed Templates

The first implementation should seed a useful starting set rather than trying to cover every vehicle perfectly.

Required seed set:

1. Engine Oil Change.
2. Oil Filter Replacement.
3. Engine Air Filter Replacement.
4. Fuel Filter Replacement.
5. Diesel Fuel Filter Replacement.
6. Water Separator Service.
7. Spark Plug Replacement.
8. Glow Plug Inspection.
9. Brake Inspection.
10. Brake Fluid Replacement.
11. Tire Pressure Check.
12. Tire Rotation.
13. Wheel Alignment.
14. Battery Health Check.
15. Coolant Check.
16. Coolant Replacement.
17. Transmission Fluid Check.
18. Manual Transmission Gear Oil Replacement.
19. Clutch Inspection.
20. Differential Oil Replacement.
21. Transfer Case Fluid Replacement.
22. Suspension Inspection.
23. Registration Renewal.
24. Insurance Renewal.
25. DEF/AdBlue Check.
26. DPF Inspection.
27. Hybrid Battery Health Check.
28. EV Battery Health Check.
