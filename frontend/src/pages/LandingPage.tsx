import React, { useState, useEffect } from 'react';
import { Film, Calendar, Clock, Ticket, Play, Info } from 'lucide-react';
import { Movie, Screening } from '../types';

interface LandingProps {
  onGoLogin: () => void;
  onGoBooking: (screeningId: number) => void;
}

export const LandingPage: React.FC<LandingProps> = ({ onGoLogin, onGoBooking }) => {
  const [movie, setMovie] = useState<Movie | null>(null);
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [stats, setStats] = useState<{ total_seats: number; available_seats: number; booked_seats: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch published movie & screenings
    Promise.all([
      fetch('/api/public/movies/current').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/public/screenings').then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([m, s]) => {
        setMovie(m);
        setScreenings(s);
        if (s && s.length > 0) {
          fetch(`/api/public/screenings/${s[0].id}/stats`)
            .then((res) => (res.ok ? res.json() : null))
            .then((st) => setStats(st));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0c0d12] text-slate-100 flex flex-col selection:bg-red-500 selection:text-white">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-[#0c0d12]/80 backdrop-blur-md border-b border-slate-800/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-lg shadow-red-600/30">
            <Film className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              CINE<span className="text-red-500">MAX</span> AUDITORIUM
            </h1>
            <p className="text-[11px] text-slate-400 font-medium tracking-wider uppercase">Campus Movie Experience</p>
          </div>
        </div>

        <nav className="flex items-center gap-6">
          <button
            onClick={onGoLogin}
            className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-red-600/30 hover:shadow-red-500/50 cursor-pointer"
          >
            Portal Login
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        {loading ? (
          <div className="h-[70vh] flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : movie ? (
          <div>
            {/* Cinematic Hero */}
            <div className="relative min-h-[75vh] flex items-center justify-center px-6 py-16 overflow-hidden">
              {/* Background Backdrop */}
              <div
                className="absolute inset-0 bg-cover bg-center filter blur-md opacity-25 scale-105"
                style={{ backgroundImage: `url(${movie.poster_url || ''})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c0d12] via-[#0c0d12]/80 to-transparent" />

              <div className="relative z-10 max-w-6xl w-full grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
                {/* Poster Card */}
                <div className="md:col-span-5 flex justify-center">
                  <div className="relative group w-72 md:w-80 rounded-2xl overflow-hidden shadow-2xl shadow-red-950/40 border border-slate-700/60 transform transition duration-300 hover:scale-[1.02]">
                    <img
                      src={movie.poster_url || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80'}
                      alt={movie.title}
                      className="w-full h-[430px] object-cover"
                    />
                    <div className="absolute top-3 left-3 px-3 py-1 bg-red-600/90 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider text-white shadow-md">
                      Now Screening
                    </div>
                  </div>
                </div>

                {/* Details Column */}
                <div className="md:col-span-7 flex flex-col gap-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="px-3 py-1 rounded-md bg-slate-800 text-slate-300 text-xs font-semibold uppercase tracking-wider border border-slate-700">
                      {movie.genre}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                      <Clock className="w-4 h-4 text-red-400" />
                      {movie.duration_minutes} Minutes
                    </span>
                    <span className="text-xs text-slate-400">• {movie.language}</span>
                  </div>

                  <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                    {movie.title}
                  </h1>

                  <p className="text-slate-300 text-base md:text-lg leading-relaxed font-normal">
                    {movie.synopsis}
                  </p>

                  {/* Screening Schedule Preview */}
                  {screenings.length > 0 && (
                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-amber-400" />
                        <div>
                          <div className="text-xs text-slate-400 uppercase font-semibold">Scheduled Date & Time</div>
                          <div className="text-white font-medium text-sm">
                            {new Date(screenings[0].screening_date).toLocaleDateString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}{' '}
                            at {screenings[0].start_time}
                          </div>
                        </div>
                      </div>

                      {stats && (
                        <div className="flex items-center gap-4 text-xs">
                          <div>
                            <span className="text-slate-400">Total: </span>
                            <span className="font-semibold text-white">{stats.total_seats}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Available: </span>
                            <span className="font-semibold text-emerald-400">{stats.available_seats}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <button
                      onClick={() => screenings.length > 0 && onGoBooking(screenings[0].id)}
                      className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold text-base transition-all duration-200 shadow-xl shadow-red-600/30 hover:scale-105 cursor-pointer"
                    >
                      <Ticket className="w-5 h-5" />
                      Book Seats Now
                    </button>

                    {movie.trailer_url && (
                      <a
                        href={movie.trailer_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold text-base border border-slate-700 transition duration-200"
                      >
                        <Play className="w-4 h-4 fill-slate-200" />
                        Watch Trailer
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Auditorium Highlights */}
            <section className="max-w-6xl mx-auto px-6 py-16 border-t border-slate-800/80">
              <h2 className="text-2xl font-bold mb-8 text-white flex items-center gap-2">
                <Info className="w-6 h-6 text-red-500" />
                Auditorium Experience & Seating
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-2">~821 Ergonomic Seats</h3>
                  <p className="text-slate-400 text-sm">
                    Three expansive seating tiers: VIP lower rows, tiered Standard floor seating, and panoramic Balcony views.
                  </p>
                </div>
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-2">Real-Time Safe Allocation</h3>
                  <p className="text-slate-400 text-sm">
                    Database transaction locking guarantees conflict-free seating without double bookings or ghost reservations.
                  </p>
                </div>
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-2">Role-Based Access</h3>
                  <p className="text-slate-400 text-sm">
                    Tailored dashboards for students, teachers, auditorium managers, and institutional super administrators.
                  </p>
                </div>
              </div>
            </section>
          </div>
        ) : (
          /* Empty State */
          <div className="h-[60vh] flex flex-col items-center justify-center text-center px-4">
            <Film className="w-16 h-16 text-slate-600 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">No Movie Currently Published</h2>
            <p className="text-slate-400 max-w-md text-sm mb-6">
              Our cinema management is configuring the next grand screening. Please log in to administrative portals to publish movies.
            </p>
            <button
              onClick={onGoLogin}
              className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition"
            >
              Sign In to Management
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 px-6 text-center text-xs text-slate-500">
        Cinemax Auditorium Management System &copy; 2026. Built with FastAPI, React & Tailwind CSS.
      </footer>
    </div>
  );
};
