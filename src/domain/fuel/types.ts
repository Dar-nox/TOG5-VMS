import type { EntityId, ISODateTimeString } from "../common";
import type { VehicleFuelType } from "../vehicles";

export type FuelLogFuelType = VehicleFuelType | "def_adblue";

export type FuelEfficiencyStatus = "official" | "estimated" | "incomplete" | "not_computed";

export type FuelLog = {
  id: EntityId;
  vehicleId: EntityId;
  fuelDate: ISODateTimeString;
  odometer: number;
  fuelType: FuelLogFuelType;
  liters: number;
  pricePerLiter?: number;
  totalAmount: number;
  stationName?: string;
  receiptNumber?: string;
  receiptDocumentId?: EntityId;
  isFullTank: boolean;
  efficiencyStatus: FuelEfficiencyStatus;
  computedKmPerLiter?: number;
  computedLitersPer100Km?: number;
  computedCostPerKm?: number;
  notes?: string;
};

export type FuelLogValidationInput = {
  odometer: unknown;
  fuelType: FuelLogFuelType;
  liters: unknown;
  totalAmount: unknown;
  isFullTank: boolean;
  vehicleFuelType?: VehicleFuelType;
  pricePerLiter?: unknown;
  previousOdometer?: number;
  allowAdminOdometerOverride?: boolean;
};

export type FuelEfficiencyInput = {
  previousOdometer: number;
  currentOdometer: number;
  liters: number;
  totalAmount: number;
  previousIsFullTank: boolean;
  currentIsFullTank: boolean;
  fuelType: FuelLogFuelType;
};

export type FuelEfficiencyCalculation = {
  status: FuelEfficiencyStatus;
  distanceKm?: number;
  kmPerLiter?: number;
  litersPer100Km?: number;
  costPerKm?: number;
  reason?: string;
};
