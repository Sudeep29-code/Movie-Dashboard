import React, { useState, useEffect } from 'react';
import { Film, Ticket, LogOut, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SeatMap } from '../components/SeatMap';
import { Movie, Screening, SeatInventory, Booking } from '../types';

export const TeacherDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const { user, token } = useAuth();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [selectedScreeningId, setSelectedScreeningId] = useState<number | null>(null);
  const [seats, setSeats] = useState<SeatInventory[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const TEACHER_MAX_SEATS = 10;

  const fetchData = async () => {
    try {
      const [movieRes, scrRes, bookRes] = await Promise.all([
        fetch('/api/public/movies/current').then((r) => r.json()),
        fetch('/api/public/screenings').then((r) => r.json()),
        fetch('/api/bookings/me', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      ]);

      setMovie(movieRes);
      setScreenings(scrRes);
      setMyBookings(bookRes || []);

      if (scrRes && scrRes.length > 0 && !selectedScreeningId) {
        setSelectedScreeningId(scrRes[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

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

  // Handle seat toggling (Teacher can select up to 10 seats)
  const handleToggleSeat = (seat: SeatInventory) => {
    if (selectedSeatIds.includes(seat.seat_id)) {
      setSelectedSeatIds(selectedSeatIds.filter((id) => id !== seat.seat_id));
    } else {
      if (selectedSeatIds.length >= TEACHER_MAX_SEATS) {
        setMessage({ type: 'error', text: `Teachers can reserve a maximum of ${TEACHER_MAX_SEATS} seats per transaction.` });
        return;
      }
      setSelectedSeatIds([...selectedSeatIds, seat.seat_id]);
    }
  };

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
        throw new Error(data.detail || 'Reservation failed');
      }

      setMessage({
        type: 'success',
        text: `Successfully reserved ${data.seats.length} seats! Reference: ${data.booking_reference}`,
      });
      setSelectedSeatIds([]);
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

  return (
    <div className="min-h-screen bg-[#0c0d12] text-slate-100 flex flex-col selection:bg-red-500 selection:text-white">
      {/* Header */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-600/30">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">Faculty Cinema Portal</h1>
            <p className="text-xs text-slate-400">Instructor: {user?.display_name}</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-400 border border-slate-700 transition text-xs font-semibold cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 flex flex-col gap-8">
        {/* Banner Alert */}
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

        {/* Screening Picker */}
        {movie && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-center">
            <img
              src={movie.poster_url || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=400&q=80'}
              alt={movie.title}
              className="w-24 h-36 object-cover rounded-xl border border-slate-700"
            />
            <div className="flex-1">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-600/30 text-blue-300 border border-blue-500/30">
                Faculty Booking Privilege: Up to {TEACHER_MAX_SEATS} Seats
              </span>
              <h2 className="text-2xl font-black text-white mt-1">{movie.title}</h2>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold">Select Showing:</span>
                {screenings.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedScreeningId(s.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                      selectedScreeningId === s.id
                        ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/30'
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

        {/* Seat Map & Atomic Multi-Booking */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Ticket className="w-5 h-5 text-blue-400" />
                Select Group / Department Seats
              </h3>
              <p className="text-xs text-slate-400">
                Atomic reservation: all selected seats will be booked together or the reservation will fail cleanly.
              </p>
            </div>

            <button
              onClick={handleConfirmBooking}
              disabled={selectedSeatIds.length === 0 || bookingLoading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm transition shadow-lg shadow-blue-600/30 disabled:opacity-40 cursor-pointer"
            >
              {bookingLoading ? 'Reserving Group...' : `Book ${selectedSeatIds.length} Seat(s)`}
            </button>
          </div>

          <SeatMap
            seats={seats}
            selectedSeatIds={selectedSeatIds}
            onToggleSeat={handleToggleSeat}
            maxSelection={TEACHER_MAX_SEATS}
            userRole="teacher"
          />
        </section>

        {/* Previous Bookings */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Department & Class Reservations</h3>
          {myBookings.length === 0 ? (
            <p className="text-xs text-slate-500">No previous faculty bookings found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myBookings.map((b) => (
                <div key={b.id} className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-blue-400">{b.booking_reference}</span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-300">
                      {b.status}
                    </span>
                  </div>
                  <div className="font-semibold text-sm text-white">{b.movie_title || 'Campus Movie'}</div>
                  <div className="text-xs text-slate-400">
                    {b.screening_date ? new Date(b.screening_date).toLocaleDateString() : ''} at {b.start_time}
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Seats ({b.seats.length}):</span>
                    <span className="font-bold text-blue-300">{b.seats.map((s) => s.seat_label).join(', ')}</span>
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
