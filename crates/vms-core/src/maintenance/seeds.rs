#[derive(Debug, Clone)]
pub struct TemplateSeed {
    pub key: &'static str,
    pub name: &'static str,
    pub category: &'static str,
    pub description: &'static str,
    pub default_time_interval_days: Option<i64>,
    pub default_odometer_interval_km: Option<i64>,
    pub default_due_soon_days: i64,
    pub default_due_soon_km: i64,
    pub priority: &'static str,
    pub rules: Vec<RuleSeed>,
}

#[derive(Debug, Clone)]
pub struct RuleSeed {
    pub applies_to_vehicle_type: Option<&'static str>,
    pub applies_to_fuel_type: Option<&'static str>,
    pub applies_to_transmission_type: Option<&'static str>,
    pub applies_to_drivetrain: Option<&'static str>,
    pub requires_feature: Option<&'static str>,
    pub excludes_feature: Option<&'static str>,
    pub rule_type: &'static str,
    pub notes: &'static str,
}

pub fn default_templates() -> Vec<TemplateSeed> {
    vec![
        template(
            "engine_oil_change",
            "Engine Oil Change",
            "oil_filters",
            "Replace engine oil for combustion or hybrid combustion engines.",
            Some(180),
            Some(5_000),
            "high",
            combustion_rules("Full EVs do not use engine oil."),
        ),
        template(
            "oil_filter_replacement",
            "Oil Filter Replacement",
            "oil_filters",
            "Replace the engine oil filter during regular oil service.",
            Some(180),
            Some(5_000),
            "high",
            combustion_rules("Full EVs do not use engine oil filters."),
        ),
        template(
            "engine_air_filter_replacement",
            "Engine Air Filter Replacement",
            "oil_filters",
            "Inspect or replace the combustion engine air filter.",
            Some(365),
            Some(10_000),
            "medium",
            combustion_rules("Full EVs do not use combustion engine air filters."),
        ),
        template(
            "fuel_filter_replacement",
            "Fuel Filter Replacement",
            "oil_filters",
            "Replace fuel filter for gasoline and hybrid gasoline vehicles when applicable.",
            Some(365),
            Some(20_000),
            "medium",
            vec![
                include().fuel("gasoline").note("Gasoline fuel system maintenance."),
                include()
                    .fuel("hybrid_gasoline")
                    .note("Hybrid gasoline fuel system maintenance."),
                exclude().fuel("diesel").note("Diesel vehicles use diesel fuel filter templates."),
                exclude()
                    .fuel("hybrid_diesel")
                    .note("Hybrid diesel vehicles use diesel fuel filter templates."),
                exclude().fuel("full_ev").note("Full EVs do not use fuel filters."),
            ],
        ),
        template(
            "diesel_fuel_filter_replacement",
            "Diesel Fuel Filter Replacement",
            "diesel_emissions",
            "Replace the diesel fuel filter.",
            Some(365),
            Some(15_000),
            "high",
            diesel_rules("Only diesel fuel systems use this template."),
        ),
        template(
            "water_separator_service",
            "Water Separator Service",
            "diesel_emissions",
            "Drain or service the diesel water separator when equipped.",
            Some(180),
            Some(10_000),
            "medium",
            diesel_rules("Only diesel fuel systems use this template."),
        ),
        template(
            "spark_plug_replacement",
            "Spark Plug Replacement",
            "gasoline_ignition",
            "Replace spark plugs on gasoline combustion engines.",
            Some(730),
            Some(40_000),
            "medium",
            vec![
                include().fuel("gasoline").note("Gasoline ignition maintenance."),
                include()
                    .fuel("hybrid_gasoline")
                    .note("Hybrid gasoline ignition maintenance."),
                exclude().fuel("diesel").note("Diesel vehicles do not use spark plugs."),
                exclude()
                    .fuel("hybrid_diesel")
                    .note("Hybrid diesel vehicles do not use spark plugs."),
                exclude().fuel("full_ev").note("Full EVs do not use spark plugs."),
            ],
        ),
        template(
            "glow_plug_inspection",
            "Glow Plug Inspection",
            "diesel_emissions",
            "Inspect glow plugs on diesel engines.",
            Some(365),
            Some(20_000),
            "medium",
            diesel_rules("Glow plugs are diesel-specific."),
        ),
        template(
            "def_adblue_check_refill",
            "DEF/AdBlue Check and Refill",
            "diesel_emissions",
            "Check DEF/AdBlue level and refill when the vehicle is equipped.",
            Some(90),
            Some(5_000),
            "medium",
            vec![
                include()
                    .fuel("diesel")
                    .requires_feature("def_adblue")
                    .note("Applies only when a diesel vehicle has DEF/AdBlue equipment."),
                include()
                    .fuel("hybrid_diesel")
                    .requires_feature("def_adblue")
                    .note("Applies only when a hybrid diesel vehicle has DEF/AdBlue equipment."),
                exclude()
                    .fuel("gasoline")
                    .note("Gasoline vehicles should not receive diesel-only DEF/AdBlue maintenance."),
                exclude()
                    .fuel("hybrid_gasoline")
                    .note("Hybrid gasoline vehicles should not receive diesel-only DEF/AdBlue maintenance."),
                exclude()
                    .fuel("full_ev")
                    .note("Full EVs should not receive diesel-only DEF/AdBlue maintenance."),
            ],
        ),
        template(
            "dpf_inspection",
            "DPF Inspection",
            "diesel_emissions",
            "Inspect diesel particulate filter condition and regeneration status.",
            Some(180),
            Some(10_000),
            "medium",
            vec![
                include()
                    .fuel("diesel")
                    .requires_feature("diesel_particulate_filter")
                    .note("Applies when a diesel vehicle has a DPF feature."),
                include()
                    .fuel("hybrid_diesel")
                    .requires_feature("diesel_particulate_filter")
                    .note("Applies when a hybrid diesel vehicle has a DPF feature."),
                exclude()
                    .fuel("gasoline")
                    .note("Gasoline vehicles should not receive DPF maintenance by default."),
                exclude()
                    .fuel("hybrid_gasoline")
                    .note("Hybrid gasoline vehicles should not receive DPF maintenance by default."),
                exclude()
                    .fuel("full_ev")
                    .note("Full EVs do not use diesel particulate filters."),
            ],
        ),
        template(
            "brake_inspection",
            "Brake Inspection",
            "brakes",
            "Inspect brake system condition.",
            Some(180),
            Some(10_000),
            "high",
            universal_rules(),
        ),
        template(
            "brake_pad_inspection_replacement",
            "Brake Pad Inspection and Replacement",
            "brakes",
            "Inspect brake pads and replace when worn.",
            Some(180),
            Some(10_000),
            "high",
            universal_rules(),
        ),
        template(
            "brake_fluid_replacement",
            "Brake Fluid Replacement",
            "brakes",
            "Replace brake fluid on the recommended interval.",
            Some(730),
            None,
            "medium",
            universal_rules(),
        ),
        template(
            "tire_pressure_check",
            "Tire Pressure Check",
            "tires_wheels",
            "Check and adjust tire pressure.",
            Some(30),
            None,
            "medium",
            universal_rules(),
        ),
        template(
            "tire_rotation",
            "Tire Rotation",
            "tires_wheels",
            "Rotate tires to promote even wear.",
            Some(180),
            Some(10_000),
            "medium",
            universal_rules(),
        ),
        template(
            "tire_tread_inspection",
            "Tire Tread Inspection",
            "tires_wheels",
            "Inspect tire tread depth and wear pattern.",
            Some(90),
            Some(5_000),
            "medium",
            universal_rules(),
        ),
        template(
            "wheel_alignment",
            "Wheel Alignment",
            "tires_wheels",
            "Check wheel alignment when wear or handling suggests it.",
            Some(365),
            Some(20_000),
            "medium",
            universal_rules(),
        ),
        template(
            "battery_health_check",
            "Battery Health Check",
            "battery_electrical",
            "Check battery condition and charging health.",
            Some(180),
            None,
            "medium",
            universal_rules(),
        ),
        template(
            "coolant_check",
            "Coolant Check",
            "cooling",
            "Check coolant level and condition for equipped vehicles.",
            Some(90),
            Some(5_000),
            "medium",
            universal_rules(),
        ),
        template(
            "coolant_replacement",
            "Coolant Replacement",
            "cooling",
            "Replace coolant on interval when the vehicle has a coolant system.",
            Some(730),
            Some(40_000),
            "medium",
            universal_rules(),
        ),
        template(
            "transmission_fluid_change",
            "Transmission Fluid Change",
            "transmission",
            "Replace automatic, CVT, or DCT transmission fluid.",
            Some(730),
            Some(40_000),
            "medium",
            vec![
                include()
                    .transmission("automatic")
                    .note("Automatic transmission fluid maintenance."),
                include().transmission("cvt").note("CVT fluid maintenance."),
                include().transmission("dct").note("DCT fluid maintenance."),
                exclude()
                    .transmission("manual")
                    .note("Manual transmissions use gear oil and clutch templates."),
                exclude().transmission("none").note("No transmission fluid template applies."),
            ],
        ),
        template(
            "manual_transmission_gear_oil",
            "Manual Transmission Gear Oil Replacement",
            "transmission",
            "Replace manual transmission gear oil.",
            Some(730),
            Some(40_000),
            "medium",
            vec![include()
                .transmission("manual")
                .note("Manual transmission gear oil maintenance.")],
        ),
        template(
            "manual_clutch_inspection",
            "Manual Clutch Inspection",
            "transmission",
            "Inspect clutch operation and wear on manual vehicles.",
            Some(365),
            Some(20_000),
            "medium",
            vec![
                include()
                    .transmission("manual")
                    .note("Manual transmission vehicles use a clutch."),
                exclude()
                    .transmission("automatic")
                    .note("Automatic vehicles do not use a manual clutch."),
                exclude().transmission("cvt").note("CVT vehicles do not use a manual clutch."),
                exclude().transmission("dct").note("DCT vehicles do not use a manual clutch."),
                exclude().transmission("none").note("No manual clutch applies."),
            ],
        ),
        template(
            "differential_oil_change",
            "Differential Oil Change",
            "transmission",
            "Replace differential oil for drivetrains that use a serviceable differential.",
            Some(730),
            Some(40_000),
            "medium",
            vec![
                include().drivetrain("rwd").note("RWD drivetrain differential maintenance."),
                include().drivetrain("awd").note("AWD drivetrain differential maintenance."),
                include().drivetrain("4wd").note("4WD drivetrain differential maintenance."),
            ],
        ),
        template(
            "transfer_case_fluid_change",
            "Transfer Case Fluid Change",
            "transmission",
            "Replace transfer case fluid for AWD or 4WD vehicles.",
            Some(730),
            Some(40_000),
            "medium",
            vec![
                include().drivetrain("awd").note("AWD transfer case maintenance."),
                include().drivetrain("4wd").note("4WD transfer case maintenance."),
                exclude()
                    .drivetrain("fwd")
                    .note("FWD vehicles should not receive transfer case maintenance by default."),
                exclude()
                    .drivetrain("rwd")
                    .note("RWD vehicles should not receive transfer case maintenance by default."),
            ],
        ),
        template(
            "cabin_air_filter_replacement",
            "Cabin Air Filter Replacement",
            "oil_filters",
            "Replace cabin air filter when equipped.",
            Some(365),
            Some(15_000),
            "low",
            universal_rules(),
        ),
        template(
            "wiper_inspection_replacement",
            "Wiper Inspection and Replacement",
            "other",
            "Inspect windshield wipers and replace when worn.",
            Some(180),
            None,
            "low",
            universal_rules(),
        ),
        template(
            "registration_renewal",
            "Registration Renewal",
            "legal_documents",
            "Track vehicle registration renewal.",
            Some(365),
            None,
            "critical",
            universal_rules(),
        ),
        template(
            "insurance_renewal",
            "Insurance Renewal",
            "legal_documents",
            "Track vehicle insurance renewal.",
            Some(365),
            None,
            "critical",
            universal_rules(),
        ),
        template(
            "exhaust_inspection",
            "Exhaust Inspection",
            "other",
            "Inspect exhaust system condition for combustion vehicles.",
            Some(365),
            Some(20_000),
            "low",
            combustion_rules("Full EVs do not use exhaust systems."),
        ),
        template(
            "timing_belt_inspection_replacement",
            "Timing Belt Inspection and Replacement",
            "belts_hoses",
            "Inspect or replace the timing belt when the vehicle has one.",
            Some(730),
            Some(60_000),
            "high",
            vec![include()
                .requires_feature("timing_belt")
                .note("Applies only when the timing belt feature is selected.")],
        ),
        template(
            "timing_chain_inspection",
            "Timing Chain Inspection",
            "belts_hoses",
            "Inspect timing chain condition when the vehicle has one.",
            Some(730),
            Some(60_000),
            "medium",
            vec![include()
                .requires_feature("timing_chain")
                .note("Applies only when the timing chain feature is selected.")],
        ),
        template(
            "turbocharger_inspection",
            "Turbocharger Inspection",
            "other",
            "Inspect turbocharger condition when equipped.",
            Some(365),
            Some(20_000),
            "medium",
            vec![include()
                .requires_feature("turbocharged")
                .note("Applies only when the turbocharged feature is selected.")],
        ),
        template(
            "hybrid_battery_health_check",
            "Hybrid Battery Health Check",
            "ev_hybrid",
            "Check hybrid battery health on hybrid vehicles.",
            Some(365),
            None,
            "medium",
            vec![
                include()
                    .fuel("hybrid_gasoline")
                    .note("Hybrid gasoline vehicle maintenance."),
                include()
                    .fuel("hybrid_diesel")
                    .note("Hybrid diesel vehicle maintenance."),
                include()
                    .requires_feature("hybrid_system")
                    .note("Applies when the hybrid system feature is selected."),
            ],
        ),
        template(
            "ev_battery_health_check",
            "EV Battery Health Check",
            "ev_hybrid",
            "Check high-voltage EV battery health.",
            Some(365),
            None,
            "medium",
            vec![
                include().fuel("full_ev").note("Full EV high-voltage battery maintenance."),
                include()
                    .requires_feature("electric_motor_system")
                    .note("Applies when the electric motor system feature is selected."),
            ],
        ),
    ]
}

fn template(
    key: &'static str,
    name: &'static str,
    category: &'static str,
    description: &'static str,
    default_time_interval_days: Option<i64>,
    default_odometer_interval_km: Option<i64>,
    priority: &'static str,
    rules: Vec<RuleSeed>,
) -> TemplateSeed {
    TemplateSeed {
        key,
        name,
        category,
        description,
        default_time_interval_days,
        default_odometer_interval_km,
        default_due_soon_days: 14,
        default_due_soon_km: 500,
        priority,
        rules,
    }
}

fn universal_rules() -> Vec<RuleSeed> {
    Vec::new()
}

fn combustion_rules(ev_note: &'static str) -> Vec<RuleSeed> {
    vec![
        include()
            .fuel("gasoline")
            .note("Gasoline combustion maintenance."),
        include()
            .fuel("diesel")
            .note("Diesel combustion maintenance."),
        include()
            .fuel("hybrid_gasoline")
            .note("Hybrid gasoline combustion maintenance."),
        include()
            .fuel("hybrid_diesel")
            .note("Hybrid diesel combustion maintenance."),
        exclude().fuel("full_ev").note(ev_note),
    ]
}

fn diesel_rules(non_diesel_note: &'static str) -> Vec<RuleSeed> {
    vec![
        include()
            .fuel("diesel")
            .note("Diesel-specific maintenance."),
        include()
            .fuel("hybrid_diesel")
            .note("Hybrid diesel-specific maintenance."),
        exclude().fuel("gasoline").note(non_diesel_note),
        exclude().fuel("hybrid_gasoline").note(non_diesel_note),
        exclude()
            .fuel("full_ev")
            .note("Full EVs should not receive diesel maintenance."),
    ]
}

fn include() -> RuleSeed {
    RuleSeed {
        applies_to_vehicle_type: None,
        applies_to_fuel_type: None,
        applies_to_transmission_type: None,
        applies_to_drivetrain: None,
        requires_feature: None,
        excludes_feature: None,
        rule_type: "include",
        notes: "",
    }
}

fn exclude() -> RuleSeed {
    RuleSeed {
        rule_type: "exclude",
        ..include()
    }
}

impl RuleSeed {
    fn fuel(mut self, fuel_type: &'static str) -> Self {
        self.applies_to_fuel_type = Some(fuel_type);
        self
    }

    fn transmission(mut self, transmission_type: &'static str) -> Self {
        self.applies_to_transmission_type = Some(transmission_type);
        self
    }

    fn drivetrain(mut self, drivetrain: &'static str) -> Self {
        self.applies_to_drivetrain = Some(drivetrain);
        self
    }

    fn requires_feature(mut self, feature: &'static str) -> Self {
        self.requires_feature = Some(feature);
        self
    }

    fn note(mut self, notes: &'static str) -> Self {
        self.notes = notes;
        self
    }
}
