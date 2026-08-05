import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useFormat } from "../providers/formatContext";
import { useToast } from "../providers/toastContext";
import { validateVehicleCreation } from "../../domain";
import type {
  Drivetrain,
  TransmissionType,
  VehicleFuelType,
  VehicleType,
} from "../../domain";
import { messageFromError } from "../../lib/errors";
import { routes } from "../../lib/routes";
import { trimToUndefined } from "../../lib/text";
import {
  createVehicle,
  getVehicle,
  storeVehiclePhoto,
  updateVehicle,
  type VehicleMutationRequest,
} from "../../services/api/vehicles";
import { Button, ButtonRow } from "../../components/ui/Button";
import { Card, CardHeader } from "../../components/ui/Card";
import {
  FieldGrid,
  FieldGridFull,
  NumberField,
  SelectField,
  TextAreaField,
  TextField,
} from "../../components/ui/Field";
import { CameraIcon } from "../../components/ui/icons";
import { SkeletonRows } from "../../components/ui/Spinner";
import { ErrorSummary } from "../../components/ui/States";
import { VehiclePhoto } from "../../components/vehicle/VehiclePhoto";

const VEHICLE_TYPES = [
  { value: "sedan", label: "Sedan" },
  { value: "suv", label: "SUV" },
  { value: "van", label: "Van" },
  { value: "truck", label: "Truck" },
  { value: "bus", label: "Bus" },
  { value: "motorcycle", label: "Motorcycle" },
  { value: "other", label: "Other" },
];

const FUEL_TYPES = [
  { value: "gasoline", label: "Gasoline" },
  { value: "diesel", label: "Diesel" },
  { value: "hybrid_gasoline", label: "Hybrid gasoline" },
  { value: "hybrid_diesel", label: "Hybrid diesel" },
  { value: "full_ev", label: "Full EV" },
  { value: "other", label: "Other" },
];

const TRANSMISSIONS = [
  { value: "unknown", label: "Not sure" },
  { value: "manual", label: "Manual" },
  { value: "automatic", label: "Automatic" },
  { value: "cvt", label: "CVT" },
  { value: "dct", label: "DCT" },
  { value: "none", label: "None" },
];

const DRIVETRAINS = [
  { value: "unknown", label: "Not sure" },
  { value: "fwd", label: "Front-wheel drive" },
  { value: "rwd", label: "Rear-wheel drive" },
  { value: "awd", label: "All-wheel drive" },
  { value: "4wd", label: "4-wheel drive" },
  { value: "none", label: "None" },
];

const STATUSES = [
  { value: "active", label: "Active" },
  { value: "under_maintenance", label: "Under maintenance" },
  { value: "inactive", label: "Inactive" },
  { value: "sold_disposed", label: "Sold or disposed of" },
];

type FormState = {
  vehicleName: string;
  primaryPhotoId: string;
  primaryPhotoPath: string;
  plateNumber: string;
  vehicleType: string;
  fuelType: string;
  transmissionType: string;
  drivetrain: string;
  currentOdometer: string;
  status: string;
  notes: string;
};

const EMPTY: FormState = {
  vehicleName: "",
  primaryPhotoId: "",
  primaryPhotoPath: "",
  plateNumber: "",
  vehicleType: "van",
  fuelType: "diesel",
  transmissionType: "unknown",
  drivetrain: "unknown",
  currentOdometer: "",
  status: "active",
  notes: "",
};

/**
 * Adding a vehicle, or changing one.
 *
 * The picture stays required — it and the name are how staff recognise a van,
 * and the reason it used to be a nuisance was that a photo meant taking one on
 * a phone and getting it onto the office PC. The phone build removes exactly
 * that, so this leads with the camera rather than a file picker.
 *
 * The plate number stays optional, per AGENTS.md rule 9.
 */
export default function VehicleEditorPage() {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const fmt = useFormat();

  const editing = Boolean(vehicleId && vehicleId !== "new");

  const [form, setForm] = useState<FormState>(EMPTY);
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<string[]>([]);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing || !vehicleId) {
      return;
    }

    let stillWanted = true;

    void (async () => {
      try {
        const vehicle = await getVehicle(vehicleId);

        if (!stillWanted) {
          return;
        }

        setForm({
          vehicleName: vehicle.vehicleName,
          primaryPhotoId: vehicle.primaryPhotoId ?? "",
          primaryPhotoPath: vehicle.primaryPhotoPath ?? "",
          plateNumber: vehicle.plateNumber ?? "",
          vehicleType: vehicle.vehicleType,
          fuelType: vehicle.fuelType,
          transmissionType: vehicle.transmissionType,
          drivetrain: vehicle.drivetrain,
          currentOdometer: String(vehicle.currentOdometer),
          status: vehicle.status === "archived" ? "inactive" : vehicle.status,
          notes: vehicle.notes ?? "",
        });
      } catch (caught) {
        toast.error(messageFromError(caught));
      } finally {
        if (stillWanted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      stillWanted = false;
    };
  }, [editing, toast, vehicleId]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handlePhoto(file: File | null) {
    if (!file) {
      return;
    }

    setPhotoBusy(true);

    try {
      const stored = await storeVehiclePhoto(file);
      setForm((current) => ({
        ...current,
        primaryPhotoId: stored.id,
        primaryPhotoPath: stored.storagePath,
      }));
      setIssues((current) => ({ ...current, primaryPhotoId: "" }));
    } catch (caught) {
      toast.error(messageFromError(caught));
    } finally {
      setPhotoBusy(false);
    }
  }

  async function handleSave() {
    const odometer = Number(form.currentOdometer);

    const validation = validateVehicleCreation({
      vehicleName: form.vehicleName,
      primaryPhotoId: form.primaryPhotoId,
      vehicleType: form.vehicleType as VehicleType,
      fuelType: form.fuelType as VehicleFuelType,
      transmissionType: form.transmissionType as TransmissionType,
      drivetrain: form.drivetrain as Drivetrain,
      currentOdometer: Number.isFinite(odometer) ? odometer : undefined,
      status: "active",
    });

    // Errors land on the field they belong to and in a summary. Only Vehicles
    // ever did the first of those, and it was the one screen that got it
    // right — so it is now what every form does.
    const byField: Record<string, string> = {};

    for (const issue of validation.issues) {
      // A few issues are about the record rather than one field; those appear
      // in the summary only.
      if (issue.field && !byField[issue.field]) {
        byField[issue.field] = issue.message;
      }
    }

    setIssues(byField);
    setSummary(validation.issues.map((issue) => issue.message));

    if (validation.issues.length > 0) {
      return;
    }

    const request: VehicleMutationRequest = {
      vehicleName: form.vehicleName.trim(),
      primaryPhotoId: form.primaryPhotoId,
      plateNumber: trimToUndefined(form.plateNumber),
      vehicleType: form.vehicleType as VehicleType,
      fuelType: form.fuelType as VehicleFuelType,
      transmissionType: form.transmissionType as TransmissionType,
      drivetrain: form.drivetrain as Drivetrain,
      currentOdometer: odometer,
      status: form.status as VehicleMutationRequest["status"],
      notes: trimToUndefined(form.notes),
    };

    setSaving(true);

    try {
      const saved =
        editing && vehicleId
          ? await updateVehicle(vehicleId, request)
          : await createVehicle(request);

      toast.success(editing ? "Vehicle updated." : "Vehicle added.");
      void navigate(routes.vehicle(saved.id));
    } catch (caught) {
      toast.error(messageFromError(caught));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <SkeletonRows rows={3} />;
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-heading @md:text-2xl">
        {editing ? "Edit vehicle" : "Add a vehicle"}
      </h1>

      <Card>
        <CardHeader title="Picture" />

        <div className="flex flex-wrap items-center gap-4">
          <VehiclePhoto
            alt=""
            className="size-24"
            storagePath={form.primaryPhotoPath || undefined}
          />

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <Button
                icon={<CameraIcon />}
                loading={photoBusy}
                onClick={() => cameraRef.current?.click()}
                variant={form.primaryPhotoId ? "secondary" : "primary"}
              >
                Take photo
              </Button>
              <Button onClick={() => fileRef.current?.click()} variant="quiet">
                Choose file
              </Button>
            </div>

            {issues.primaryPhotoId ? (
              <p className="text-xs font-semibold text-overdue" role="alert">
                {issues.primaryPhotoId}
              </p>
            ) : (
              <p className="text-xs text-muted">
                How everyone recognises this vehicle in the app.
              </p>
            )}
          </div>
        </div>

        <input
          accept="image/*"
          aria-label="Take a photo of the vehicle"
          capture="environment"
          className="sr-only"
          onChange={(event) => void handlePhoto(event.target.files?.[0] ?? null)}
          ref={cameraRef}
          type="file"
        />
        <input
          accept="image/png,image/jpeg,image/webp"
          aria-label="Choose a picture of the vehicle"
          className="sr-only"
          onChange={(event) => void handlePhoto(event.target.files?.[0] ?? null)}
          ref={fileRef}
          type="file"
        />
      </Card>

      <Card>
        <CardHeader title="Details" />

        <div className="flex flex-col gap-4">
          <ErrorSummary issues={summary} />

          <FieldGrid>
            <TextField
              error={issues.vehicleName}
              label="Name"
              onChange={(value) => update("vehicleName", value)}
              placeholder="Blue Hiace"
              required
              value={form.vehicleName}
            />
            <TextField
              label="Plate number"
              onChange={(value) => update("plateNumber", value)}
              optional
              value={form.plateNumber}
            />

            <NumberField
              error={issues.currentOdometer}
              label="Odometer"
              onChange={(value) => update("currentOdometer", value)}
              required
              unit={fmt.distanceLabel}
              value={form.currentOdometer}
            />
            <SelectField
              label="Status"
              onChange={(value) => update("status", value)}
              options={STATUSES}
              value={form.status}
            />

            <SelectField
              error={issues.vehicleType}
              label="Type"
              onChange={(value) => update("vehicleType", value)}
              options={VEHICLE_TYPES}
              value={form.vehicleType}
            />
            <SelectField
              error={issues.fuelType}
              hint="Decides which maintenance applies — a diesel never asks for spark plugs."
              label="Fuel"
              onChange={(value) => update("fuelType", value)}
              options={FUEL_TYPES}
              value={form.fuelType}
            />

            <SelectField
              label="Transmission"
              onChange={(value) => update("transmissionType", value)}
              options={TRANSMISSIONS}
              value={form.transmissionType}
            />
            <SelectField
              label="Drivetrain"
              onChange={(value) => update("drivetrain", value)}
              options={DRIVETRAINS}
              value={form.drivetrain}
            />

            <FieldGridFull>
              <TextAreaField
                label="Notes"
                onChange={(value) => update("notes", value)}
                optional
                value={form.notes}
              />
            </FieldGridFull>
          </FieldGrid>

          <ButtonRow>
            <Button onClick={() => void navigate(routes.vehicles)}>Cancel</Button>
            <Button loading={saving} onClick={() => void handleSave()} variant="primary">
              {editing ? "Save changes" : "Add vehicle"}
            </Button>
          </ButtonRow>
        </div>
      </Card>
    </div>
  );
}
