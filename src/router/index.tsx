import type { ReactNode } from "react";
import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import FollowUpAutomation from "../pages/FollowUpAutomation";
import AIBusinessAssistant from "../pages/AIBusinessAssistant";
import ProtectedRoute from "../components/ProtectedRoute";
import PermissionRoute from "../components/PermissionRoute";
import Sidebar from "../components/Sidebar";
import Refunds from "../pages/Refunds";
import Dashboard from "../pages/Dashboard";
import POS from "../pages/POS";
import Members from "../pages/Members";
import Vehicles from "../pages/Vehicles";
import Services from "../pages/Services";
import Products from "../pages/Products";
import Packages from "../pages/Packages";
import Orders from "../pages/Orders";
import Reports from "../pages/Reports";
import Expenses from "../pages/Expenses";
import Employees from "../pages/Employees";
import Settings from "../pages/Settings";
import Appointments from "../pages/Appointments";
import Inspection from "../pages/Inspection";

import CustomerMenu from "../pages/CustomerMenu";
import BookingSuccess from "../pages/BookingSuccess";
import CustomerQR from "../pages/CustomerQR";
import MenuQRCode from "../pages/MenuQRCode";
import Login from "../pages/login";

function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
        }}
      >
        <Sidebar />

        <main
          style={{
            flex: 1,
            minWidth: 0,
            padding: 24,
          }}
        >
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}

function ProtectedPage({
  permission,
  children,
}: {
  permission?: string;
  children: ReactNode;
}) {
  return (
    <AppLayout>
      {permission ? (
        <PermissionRoute
          permission={permission}
        >
          {children}
        </PermissionRoute>
      ) : (
        children
      )}
    </AppLayout>
  );
}

function AppRouter() {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/menu"
        element={<CustomerMenu />}
      />

      <Route
        path="/booking-success"
        element={<BookingSuccess />}
      />

      {/* Protected business routes */}
      <Route
        path="/"
        element={
          <ProtectedPage permission="dashboard">
            <Dashboard />
          </ProtectedPage>
        }
      />
<Route
  path="/follow-up-automation"
  element={<FollowUpAutomation />}
/>
      <Route
        path="/pos"
        element={
          <ProtectedPage permission="pos">
            <POS />
          </ProtectedPage>
        }
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
          <ProtectedPage permission="members">
            <Members />
          </ProtectedPage>
        }
      />

      <Route
        path="/vehicles"
        element={
          <ProtectedPage permission="vehicles">
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
          <ProtectedPage permission="orders">
            <Orders />
          </ProtectedPage>
        }
      />
<Route
  path="/refunds"
  element={
    <PermissionRoute permission="orders">
      <Refunds />
    </PermissionRoute>
  }
/>
      <Route
        path="/ai-business-assistant"
        element={
          <ProtectedPage permission="reports">
            <AIBusinessAssistant />
          </ProtectedPage>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedPage permission="reports">
            <Reports />
          </ProtectedPage>
        }
      />
<Route
  path="/expenses"
  element={
    <ProtectedPage permission="reports">
      <Expenses />
    </ProtectedPage>
  }
/>
      <Route
        path="/inspection"
        element={
          <ProtectedPage permission="inspection">
            <Inspection />
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

      {/* QR management pages require login */}
      <Route
        path="/customer-qr"
        element={
          <ProtectedPage>
            <CustomerQR />
          </ProtectedPage>
        }
      />

      <Route
        path="/menu-qr"
        element={
          <ProtectedPage>
            <MenuQRCode />
          </ProtectedPage>
        }
      />

      {/* Unknown address */}
      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />
    </Routes>
  );
}

export default AppRouter;