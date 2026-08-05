import { VehicleModule } from "../../components/vehicles/VehicleModule";

/**
 * Adding and editing a vehicle.
 *
 * Still the original module, which carries the ten-field form and the photo
 * upload. It is reachable at its own address now instead of being a mode of
 * the vehicles screen, and it is rebuilt with the rest of the forms.
 */
export default function VehicleEditorPage() {
  return <VehicleModule />;
}
