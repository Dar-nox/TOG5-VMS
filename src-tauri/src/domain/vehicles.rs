use serde::{Deserialize, Serialize};

use super::common::{EntityId, IsoDateString, IsoDateTimeString};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum VehicleType {
    Sedan,
    Suv,
    Van,
    Truck,
    Bus,
    Motorcycle,
    Other,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum VehicleFuelType {
    Gasoline,
    Diesel,
    HybridGasoline,
    HybridDiesel,
    FullEv,
    Other,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TransmissionType {
    Manual,
    Automatic,
    Cvt,
    Dct,
    None,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Drivetrain {
    Fwd,
    Rwd,
    Awd,
    FourWd,
    None,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum VehicleStatus {
    Active,
    UnderMaintenance,
    Inactive,
    Archived,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum VehicleFeatureKey {
    Turbocharged,
    Supercharged,
    DieselParticulateFilter,
    DefAdblue,
    TimingBelt,
    TimingChain,
    Carbureted,
    FuelInjected,
    HybridSystem,
    ElectricMotorSystem,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct VehicleFeature {
    pub feature_key: VehicleFeatureKey,
    pub enabled: bool,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Vehicle {
    pub id: EntityId,
    pub vehicle_name: String,
    pub primary_photo_id: Option<EntityId>,
    pub plate_number: Option<String>,
    pub vehicle_type: VehicleType,
    pub fuel_type: VehicleFuelType,
    pub transmission_type: Option<TransmissionType>,
    pub drivetrain: Option<Drivetrain>,
    pub current_odometer: f64,
    pub status: VehicleStatus,
    pub features: Vec<VehicleFeature>,
    pub created_at: Option<IsoDateTimeString>,
    pub updated_at: Option<IsoDateTimeString>,
    pub archived_at: Option<IsoDateTimeString>,
    pub registration_expiry: Option<IsoDateString>,
    pub insurance_expiry: Option<IsoDateString>,
}
