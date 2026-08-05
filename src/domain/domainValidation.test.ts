import { describe, expect, it } from "vitest";
import {
  calculateOfficialFuelEfficiency,
  validateFuelLog,
  validateOdometerProgression,
  validateVehicleCreation,
} from ".";

describe("vehicle validation", () => {
  it("requires a trimmed vehicle name", () => {
    const result = validateVehicleCreation({
      vehicleName: "   ",
      primaryPhotoId: "photo-1",
      vehicleType: "van",
      fuelType: "diesel",
      currentOdometer: 0,
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "required_text", field: "vehicleName" }),
    );
  });

  it("requires a vehicle picture for normal creation", () => {
    const result = validateVehicleCreation({
      vehicleName: "Hiace",
      vehicleType: "van",
      fuelType: "diesel",
      currentOdometer: 0,
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "required_text", field: "primaryPhotoId" }),
    );
  });

  it("allows plate number to be omitted", () => {
    const result = validateVehicleCreation({
      vehicleName: "Delivery Van",
      primaryPhotoId: "photo-1",
      vehicleType: "van",
      fuelType: "diesel",
      currentOdometer: 10,
    });

    expect(result.valid).toBe(true);
    expect(result.value?.plateNumber).toBeUndefined();
  });

  it("rejects odometer rollback unless an admin override is allowed", () => {
    const blocked = validateOdometerProgression({
      currentOdometer: 900,
      previousOdometer: 1000,
    });
    const override = validateOdometerProgression({
      currentOdometer: 900,
      previousOdometer: 1000,
      allowAdminOverride: true,
    });

    expect(blocked).toContainEqual(expect.objectContaining({ severity: "error" }));
    expect(override).toContainEqual(expect.objectContaining({ severity: "warning" }));
  });
});

describe("fuel validation", () => {
  it("computes official efficiency only for valid full-tank logs", () => {
    const official = calculateOfficialFuelEfficiency({
      previousOdometer: 10_000,
      currentOdometer: 10_350,
      liters: 35,
      totalAmount: 2800,
      previousIsFullTank: true,
      currentIsFullTank: true,
      fuelType: "diesel",
    });
    const incomplete = calculateOfficialFuelEfficiency({
      previousOdometer: 10_000,
      currentOdometer: 10_350,
      liters: 35,
      totalAmount: 2800,
      previousIsFullTank: true,
      currentIsFullTank: false,
      fuelType: "diesel",
    });

    expect(official.status).toBe("official");
    expect(official.kmPerLiter).toBe(10);
    expect(incomplete.status).toBe("not_computed");
  });

  it("warns on fuel type mismatch without making the entry invalid", () => {
    const result = validateFuelLog({
      odometer: 100,
      fuelType: "gasoline",
      vehicleFuelType: "diesel",
      liters: 40,
      totalAmount: 3000,
      isFullTank: true,
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "fuel_type_mismatch", severity: "warning" }),
    );
  });

  it("does not count DEF/AdBlue as diesel fuel consumption", () => {
    const result = calculateOfficialFuelEfficiency({
      previousOdometer: 10_000,
      currentOdometer: 10_350,
      liters: 12,
      totalAmount: 900,
      previousIsFullTank: true,
      currentIsFullTank: true,
      fuelType: "def_adblue",
    });

    expect(result.status).toBe("not_computed");
    expect(result.reason).toContain("DEF/AdBlue");
  });
});
