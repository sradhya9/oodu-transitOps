import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AuthGuard from './components/AuthGuard';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Vehicles from './pages/Vehicles';
import Drivers from './pages/Drivers';
import Trips from './pages/Trips';
import Maintenance from './pages/Maintenance';
import FuelLogs from './pages/FuelLogs';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route element={<AuthGuard><MainLayout /></AuthGuard>}>
          {/* Dashboard - All Roles */}
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* Fleet Manager Only */}
          <Route path="vehicles" element={<AuthGuard allowedRoles={['Fleet Manager']}><Vehicles /></AuthGuard>} />
          <Route path="maintenance" element={<AuthGuard allowedRoles={['Fleet Manager']}><Maintenance /></AuthGuard>} />
          <Route path="/settings" element={<AuthGuard allowedRoles={['Fleet Manager']}><Settings /></AuthGuard>} />
          
          {/* Fleet Manager & Safety Officer */}
          <Route path="drivers" element={<AuthGuard allowedRoles={['Fleet Manager', 'Safety Officer']}><Drivers /></AuthGuard>} />
          
          {/* Fleet Manager & Dispatcher */}
          <Route path="trips" element={<AuthGuard allowedRoles={['Fleet Manager', 'Dispatcher']}><Trips /></AuthGuard>} />
          
          {/* Fleet Manager & Financial Analyst */}
          <Route path="fuel-logs" element={<AuthGuard allowedRoles={['Fleet Manager', 'Financial Analyst']}><FuelLogs /></AuthGuard>} />
          <Route path="expenses" element={<AuthGuard allowedRoles={['Fleet Manager', 'Financial Analyst']}><Expenses /></AuthGuard>} />
          
          {/* Shared Reports */}
          <Route path="reports" element={<AuthGuard allowedRoles={['Fleet Manager', 'Safety Officer', 'Financial Analyst']}><Reports /></AuthGuard>} />
          
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
