import { useNavigate } from "react-router";
import { DashboardModule } from "../../components/dashboard/DashboardModule";
import { routeForTargetPage } from "../../lib/routes";

export default function DashboardPage() {
  const navigate = useNavigate();

  return (
    <DashboardModule
      onNavigate={(targetPage) => {
        const route = routeForTargetPage(targetPage);

        if (route) {
          void navigate(route);
        }
      }}
    />
  );
}
