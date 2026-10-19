import React, { useState, useEffect } from 'react';
import { Film, Calendar, Ticket, Bell, LogOut, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SeatMap } from '../components/SeatMap';
import { Movie, Screening, SeatInventory, Booking, NotificationItem } from '../types';

export const StudentDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const { user, token } = useAuth();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [selectedScreeningId, setSelectedScreeningId] = useState<number | null>(null);
  const [seats, setSeats] = useState<SeatInventory[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load basic data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [movieRes, scrRes, bookRes, notifRes] = await Promise.all([
        fetch('/api/public/movies/current').then((r) => r.json()),
        fetch('/api/public/screenings').then((r) => r.json()),
        fetch('/api/bookings/me', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
        fetch('/api/notifications/me', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      ]);

      setMovie(movieRes);
      setScreenings(scrRes);
      setMyBookings(bookRes || []);
      setNotifications(notifRes || []);

      if (scrRes && scrRes.length > 0 && !selectedScreeningId) {
        setSelectedScreeningId(scrRes[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch seats whenever selected screening changes
  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedScreeningId) {
      fetch(`/api/public/screenings/${selectedScreeningId}/seats`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          setSeats(data);
          setSelectedSeatIds([]);
        });
    }
  }, [selectedScreeningId]);

  // Handle seat toggling (Student rule: max 1 seat)
  const handleToggleSeat = (seat: SeatInventory) => {
    if (selectedSeatIds.includes(seat.seat_id)) {
      setSelectedSeatIds([]);
    } else {
      setSelectedSeatIds([seat.seat_id]); // replaces with the single new seat
    }
  };

  // Confirm Booking
  const handleConfirmBooking = async () => {
    if (!selectedScreeningId || selectedSeatIds.length === 0) return;
    setBookingLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          screening_id: selectedScreeningId,
          seat_ids: selectedSeatIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Booking failed');
      }

      setMessage({ type: 'success', text: `Seat ${data.seats[0].seat_label} reserved! Reference: ${data.booking_reference}` });
      setSelectedSeatIds([]);
      // Refresh bookings and seats
      fetchData();
      if (selectedScreeningId) {
        fetch(`/api/public/screenings/${selectedScreeningId}/seats`)
          .then((r) => r.json())
          .then((d) => setSeats(d));
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setBookingLoading(false);
    }
  };

  // Check if current user already has booking for selected screening
  const currentScreeningBooking = myBookings.find(
    (b) => b.screening_id === selectedScreeningId && b.status === 'confirmed'
  );

  return (
    <div className="min-h-screen bg-[#0c0d12] text-slate-100 flex flex-col selection:bg-red-500 selection:text-white">
      {/* Top Navbar */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-lg shadow-red-600/30">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">Student Cinema Portal</h1>
            <p className="text-xs text-slate-400">Welcome, {user?.display_name}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs">
              <Bell className="w-4 h-4 text-amber-400" />
              <span>{notifications.length} Notification(s)</span>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-400 border border-slate-700 transition text-xs font-semibold cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 flex flex-col gap-8">
        {/* Banner Alert Message */}
        {message && (
          <div
            className={`p-4 rounded-xl border flex items-center gap-3 text-sm ${
              message.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                : 'bg-red-950/60 border-red-800 text-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* Notifications Tray */}
        {notifications.length > 0 && (
          <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
            <h2 className="text-xs uppercase font-bold tracking-wider text-amber-400 mb-2 flex items-center gap-2">
              <Bell className="w-4 h-4" /> Batch Announcements
            </h2>
            <div className="flex flex-col gap-2">
              {notifications.map((n) => (
                <div key={n.id} className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
                  <div className="font-bold text-white mb-0.5">{n.title}</div>
                  <div className="text-slate-300">{n.body}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Current Movie & Screenings Selector */}
        {movie && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-center">
            <img
              src={movie.poster_url || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=400&q=80'}
              alt={movie.title}
              className="w-28 h-40 object-cover rounded-xl shadow-md border border-slate-700"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-red-600/30 text-red-300 border border-red-500/30">
                  {movie.genre}
                </span>
                <span className="text-xs text-slate-400">{movie.duration_minutes} Mins</span>
              </div>
              <h2 className="text-2xl font-black text-white">{movie.title}</h2>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{movie.synopsis}</p>

              {/* Screening Selection Pills */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold mr-1">Select Screening:</span>
                {screenings.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedScreeningId(s.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                      selectedScreeningId === s.id
                        ? 'bg-red-600 border-red-500 text-white shadow-md shadow-red-600/30'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {new Date(s.screening_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} @ {s.start_time}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Seating Map & Booking Panel */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Ticket className="w-5 h-5 text-red-500" />
                Auditorium Seat Selection (~821 Seats)
              </h3>
              <p className="text-xs text-slate-400">
                Rule: Students are permitted <strong className="text-amber-400">1 seat per screening</strong>.
              </p>
            </div>

            {currentScreeningBooking ? (
              <div className="px-4 py-2 rounded-xl bg-amber-950/60 border border-amber-700 text-amber-200 text-xs font-semibold">
                You already booked Seat {currentScreeningBooking.seats[0]?.seat_label} for this screening!
              </div>
            ) : (
              <button
                onClick={handleConfirmBooking}
                disabled={selectedSeatIds.length === 0 || bookingLoading}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold text-sm transition shadow-lg shadow-red-600/30 disabled:opacity-40 cursor-pointer"
              >
                {bookingLoading ? 'Reserving...' : `Confirm Seat Reservation (${selectedSeatIds.length})`}
              </button>
            )}
          </div>

          <SeatMap
            seats={seats}
            selectedSeatIds={selectedSeatIds}
            onToggleSeat={handleToggleSeat}
            maxSelection={1}
            userRole="student"
          />
        </section>

        {/* Booking History */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">My Booking History</h3>
          {myBookings.length === 0 ? (
            <p className="text-xs text-slate-500">No previous bookings found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myBookings.map((b) => (
                <div key={b.id} className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-amber-400">{b.booking_reference}</span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        b.status === 'confirmed' ? 'bg-emerald-950 text-emerald-300' : 'bg-red-950 text-red-300'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                  <div className="font-semibold text-sm text-white">{b.movie_title || 'Campus Movie'}</div>
                  <div className="text-xs text-slate-400">
                    {b.screening_date ? new Date(b.screening_date).toLocaleDateString() : ''} at {b.start_time}
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Reserved Seat:</span>
                    <span className="font-bold text-red-400">{b.seats.map((s) => s.seat_label).join(', ')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
