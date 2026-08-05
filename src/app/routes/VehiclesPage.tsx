import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { VehiclePhoto } from "../../components/vehicle/VehiclePhoto";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { DataList, DataRow, MetaItem } from "../../components/ui/DataRow";
import { TextField } from "../../components/ui/Field";
import { SkeletonRows } from "../../components/ui/Spinner";
import { EmptyState, ErrorBlock } from "../../components/ui/States";
import { toneForVehicleStatus } from "../../components/ui/tones";
import { messageFromError } from "../../lib/errors";
import { routes } from "../../lib/routes";
import { labelFromKey } from "../../lib/text";
import { useFormat } from "../providers/formatContext";
import { listVehicles, type VehicleRecord } from "../../services/api/vehicles";

/**
 * The fleet.
 *
 * The way in to almost everything now, so it is a list you can scan and search
 * rather than one half of a master–detail split that only worked on a wide
 * screen.
 */
export default function VehiclesPage() {
  const navigate = useNavigate();
  const fmt = useFormat();

  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stillWanted = true;

    void (async () => {
      try {
        const records = await listVehicles();

        if (stillWanted) {
          setVehicles(records);
        }
      } catch (caught) {
        if (stillWanted) {
          setError(messageFromError(caught));
        }
      } finally {
        if (stillWanted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      stillWanted = false;
    };
  }, []);

  const needle = query.trim().toLowerCase();
  const shown = needle
    ? vehicles.filter(
        (vehicle) =>
          vehicle.vehicleName.toLowerCase().includes(needle) ||
          (vehicle.plateNumber ?? "").toLowerCase().includes(needle),
      )
    : vehicles;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 @md:flex-row @md:items-end @md:justify-between">
        <h1 className="text-xl font-semibold text-heading @md:text-2xl">Vehicles</h1>
        <Button onClick={() => void navigate("/vehicles/new")} variant="primary">
          Add vehicle
        </Button>
      </div>

      {error ? <ErrorBlock message={error} /> : null}

      {vehicles.length > 4 ? (
        <TextField
          label="Find a vehicle"
          onChange={setQuery}
          optional
          placeholder="Name or plate number"
          value={query}
        />
      ) : null}

      {loading ? (
        <SkeletonRows rows={4} />
      ) : shown.length === 0 ? (
        <EmptyState
          action={
            vehicles.length === 0 ? (
              <Button onClick={() => void navigate("/vehicles/new")} variant="primary">
                Add the first vehicle
              </Button>
            ) : undefined
          }
          title={vehicles.length === 0 ? "No vehicles yet." : "No vehicle matches that."}
        />
      ) : (
        <DataList>
          {shown.map((vehicle) => (
            <DataRow
              key={vehicle.id}
              media={
                <VehiclePhoto
                  alt=""
                  className="size-14"
                  storagePath={vehicle.primaryPhotoPath}
                />
              }
              meta={
                <>
                  <MetaItem
                    label="Odometer"
                    numeric
                    value={fmt.distance(vehicle.currentOdometer)}
                  />
                  <MetaItem label="Fuel" value={labelFromKey(vehicle.fuelType)} />
                  <MetaItem label="Type" value={labelFromKey(vehicle.vehicleType)} />
                </>
              }
              onClick={() => void navigate(routes.vehicle(vehicle.id))}
              openLabel={`Open ${vehicle.vehicleName}`}
              subtitle={vehicle.plateNumber ?? undefined}
              title={
                <span className="flex flex-wrap items-center gap-2">
                  {vehicle.vehicleName}
                  {vehicle.status === "active" ? null : (
                    <Badge tone={toneForVehicleStatus(vehicle.status)}>
                      {labelFromKey(vehicle.status)}
                    </Badge>
                  )}
                </span>
              }
            />
          ))}
        </DataList>
      )}
    </div>
  );
}
