import Appointments from "../pages/Appointments";
import { Routes, Route } from "react-router-dom";
import Packages from "../pages/Packages";
import ProtectedRoute from "../components/ProtectedRoute";
import PermissionRoute from "../components/PermissionRoute";
import Sidebar from "../components/Sidebar";
import Dashboard from "../pages/Dashboard";
import POS from "../pages/POS";
import Members from "../pages/Members";
import Vehicles from "../pages/Vehicles";
import Services from "../pages/Services";
import Products from "../pages/Products";
import Orders from "../pages/Orders";
import Reports from "../pages/Reports";
import Employees from "../pages/Employees";
import Settings from "../pages/Settings";
import CustomerMenu from "../pages/CustomerMenu";
import BookingSuccess from "../pages/BookingSuccess";
import Inspection from "../pages/Inspection";
import Login from "../pages/login";
import CustomerQR from "../pages/CustomerQR";
import MenuQRCode from "../pages/MenuQRCode";
function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div style={{ display: "flex" }}>
        <Sidebar />
        <main style={{ flex: 1, padding: 24 }}>{children}</main>
      </div>
    </ProtectedRoute>
  );
}

function ProtectedPage({
  permission,
  children,
}: {
  permission?: string;
  children: React.ReactNode;
}) {
  return (
    <AppLayout>
      {permission ? (
        <PermissionRoute permission={permission}>{children}</PermissionRoute>
      ) : (
        children
      )}
    </AppLayout>
  );
}

function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/menu" element={<CustomerMenu />} />
<Route
  path="/booking-success"
  element={<BookingSuccess />}
/>
      <Route
        path="/"
        element={
          <ProtectedPage>
            <Dashboard />
          </ProtectedPage>
        }
      />
<Route
  path="/menu-qr"
  element={<MenuQRCode />}
/>
      <Route
        path="/pos"
        element={
          <ProtectedPage>
            <POS />
          </ProtectedPage>
        }
      />
<Route
  path="/customer-qr"
  element={<CustomerQR />}
/>
<Route
  path="/appointments"
  element={
    <ProtectedPage permission="appointments">
      <Appointments />
    </ProtectedPage>
  }
/>

      <Route
        path="/members"
        element={
          <ProtectedPage>
            <Members />
          </ProtectedPage>
        }
      />

      <Route
        path="/vehicles"
        element={
          <ProtectedPage>
            <Vehicles />
          </ProtectedPage>
        }
      />

      <Route
        path="/services"
        element={
          <ProtectedPage permission="services">
            <Services />
          </ProtectedPage>
        }
      />

<Route
  path="/packages"
  element={
    <ProtectedPage permission="packages">
      <Packages />
    </ProtectedPage>
  }
/>

      <Route
        path="/products"
        element={
          <ProtectedPage permission="products">
            <Products />
          </ProtectedPage>
        }
      />

      <Route
        path="/orders"
        element={
          <ProtectedPage>
            <Orders />
          </ProtectedPage>
        }
      />
<Route path="/packages" element={<Packages />} />
      <Route
        path="/reports"
        element={
          <ProtectedPage permission="reports">
            <Reports />
          </ProtectedPage>
        }
      />


      <Route
        path="/employees"
        element={
          <ProtectedPage permission="employees">
            <Employees />
          </ProtectedPage>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedPage permission="settings">
            <Settings />
          </ProtectedPage>
        }
      />

      <Route
        path="/inspection"
        element={
          <ProtectedPage>
            <Inspection />
          </ProtectedPage>
        }
      />
    </Routes>
  );
}

export default AppRouter;