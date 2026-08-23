import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { CatalogPage } from './pages/CatalogPage';
import { BookingPage } from './pages/BookingPage';
import { ConfirmationPage } from './pages/ConfirmationPage';
import { EventTypesPage } from './pages/admin/EventTypesPage';
import { BookingsPage } from './pages/admin/BookingsPage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<LandingPage />} />

        {/* Публичный сценарий гостя */}
        <Route path="book" element={<CatalogPage />} />
        <Route path="book/:eventTypeId" element={<BookingPage />} />
        <Route path="bookings/:bookingId" element={<ConfirmationPage />} />

        {/* Админка владельца календаря */}
        <Route path="admin" element={<Navigate to="/admin/event-types" replace />} />
        <Route path="admin/event-types" element={<EventTypesPage />} />
        <Route path="admin/bookings" element={<BookingsPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
