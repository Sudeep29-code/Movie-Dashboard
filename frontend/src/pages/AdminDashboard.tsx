import React, { useState, useEffect } from 'react';
import { Film, Calendar, Users, Bell, LogOut, Plus, CheckCircle, AlertCircle, BarChart3, Layers } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Movie, Screening, Batch, SeatInventory } from '../types';

export const AdminDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const { user, token } = useAuth();
  const [tab, setTab] = useState<'overview' | 'movies' | 'screenings' | 'batches' | 'notifications'>('overview');
  const [analytics, setAnalytics] = useState<any>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  // Form states
  const [newMovie, setNewMovie] = useState({
    title: '',
    synopsis: '',
    genre: 'Action / Sci-Fi',
    duration_minutes: 120,
    language: 'English',
    poster_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
    trailer_url: 'https://www.youtube.com/watch?v=zSWdZVtXT7E',
    is_published: true,
  });

  const [newScreening, setNewScreening] = useState({
    movie_id: 1,
    screening_date: '2026-10-21T18:30:00',
    start_time: '18:30',
    end_time: '21:00',
  });

  const [newBatch, setNewBatch] = useState({ name: '', description: '' });

  const [notifForm, setNotifForm] = useState({
    title: '',
    body: '',
    target_all: false,
    batch_ids: [] as number[],
  });

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAdminData = async () => {
    try {
      const [anRes, movRes, scrRes, batRes] = await Promise.all([
        fetch('/api/admin/analytics', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
        fetch('/api/admin/movies', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
        fetch('/api/public/screenings').then((r) => r.json()),
        fetch('/api/admin/batches', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      ]);

      setAnalytics(anRes);
      setMovies(movRes || []);
      setScreenings(scrRes || []);
      setBatches(batRes || []);
      if (movRes && movRes.length > 0) {
        setNewScreening((prev) => ({ ...prev, movie_id: movRes[0].id }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleCreateMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await fetch('/api/admin/movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newMovie),
      });
      if (!res.ok) throw new Error('Failed to create movie');
      setMessage({ type: 'success', text: `Movie '${newMovie.title}' added successfully!` });
      fetchAdminData();
      setTab('movies');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleCreateScreening = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await fetch('/api/admin/screenings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newScreening),
      });
      if (!res.ok) throw new Error('Failed to schedule screening');
      setMessage({ type: 'success', text: 'Screening scheduled and ~821 seats initialized!' });
      fetchAdminData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await fetch('/api/admin/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newBatch),
      });
      if (!res.ok) throw new Error('Failed to create batch');
      setMessage({ type: 'success', text: `Batch '${newBatch.name}' registered!` });
      setNewBatch({ name: '', description: '' });
      fetchAdminData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(notifForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to dispatch notification');
      setMessage({ type: 'success', text: `Notification delivered to ${data.recipients_count} targeted student(s)!` });
      setNotifForm({ title: '', body: '', target_all: false, batch_ids: [] });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0d12] text-slate-100 flex flex-col selection:bg-red-500 selection:text-white">
      {/* Header */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-red-600 flex items-center justify-center shadow-lg shadow-amber-600/30">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">Auditorium Admin Control Panel</h1>
            <p className="text-xs text-slate-400">Manager: {user?.display_name}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-2">
          {(['overview', 'movies', 'screenings', 'batches', 'notifications'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setMessage(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition cursor-pointer ${
                tab === t
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {t}
            </button>
          ))}
          <button
            onClick={onLogout}
            className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-400 border border-slate-700 transition text-xs font-semibold cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Exit
          </button>
        </nav>
      </header>

      {/* Main Panel */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 flex flex-col gap-6">
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

        {/* TAB 1: OVERVIEW */}
        {tab === 'overview' && analytics && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
                <div className="text-xs text-slate-400 uppercase font-semibold">Registered Students</div>
                <div className="text-2xl font-black text-white mt-1">{analytics.total_students}</div>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
                <div className="text-xs text-slate-400 uppercase font-semibold">Faculty / Teachers</div>
                <div className="text-2xl font-black text-white mt-1">{analytics.total_teachers}</div>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
                <div className="text-xs text-slate-400 uppercase font-semibold">Active Batches</div>
                <div className="text-2xl font-black text-white mt-1">{analytics.total_batches}</div>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
                <div className="text-xs text-slate-400 uppercase font-semibold">Total Booked Seats</div>
                <div className="text-2xl font-black text-amber-400 mt-1">{analytics.booked_seat_slots}</div>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-500" />
                Auditorium Capacity Utilization
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Occupancy: <strong className="text-emerald-400">{analytics.occupancy_rate_percent}%</strong> across {analytics.total_seat_slots} available seat slots.
              </p>
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-red-500 h-full transition-all duration-500"
                  style={{ width: `${analytics.occupancy_rate_percent}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MOVIES */}
        {tab === 'movies' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" /> Add New Movie Feature
              </h3>
              <form onSubmit={handleCreateMovie} className="flex flex-col gap-3 text-xs">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Movie Title</label>
                  <input
                    type="text"
                    required
                    value={newMovie.title}
                    onChange={(e) => setNewMovie({ ...newMovie, title: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Genre</label>
                  <input
                    type="text"
                    required
                    value={newMovie.genre}
                    onChange={(e) => setNewMovie({ ...newMovie, genre: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Duration (Mins)</label>
                    <input
                      type="number"
                      required
                      value={newMovie.duration_minutes}
                      onChange={(e) => setNewMovie({ ...newMovie, duration_minutes: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Language</label>
                    <input
                      type="text"
                      required
                      value={newMovie.language}
                      onChange={(e) => setNewMovie({ ...newMovie, language: e.target.value })}
                      className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Poster URL</label>
                  <input
                    type="url"
                    value={newMovie.poster_url}
                    onChange={(e) => setNewMovie({ ...newMovie, poster_url: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Trailer URL (YouTube)</label>
                  <input
                    type="url"
                    value={newMovie.trailer_url}
                    onChange={(e) => setNewMovie({ ...newMovie, trailer_url: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Synopsis</label>
                  <textarea
                    rows={3}
                    required
                    value={newMovie.synopsis}
                    onChange={(e) => setNewMovie({ ...newMovie, synopsis: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="mt-2 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 font-bold text-white transition cursor-pointer"
                >
                  Publish Movie
                </button>
              </form>
            </div>

            <div className="md:col-span-7 flex flex-col gap-4">
              <h3 className="text-base font-bold text-white">Configured Movies</h3>
              {movies.map((m) => (
                <div key={m.id} className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex gap-4 items-center">
                  <img src={m.poster_url || ''} alt={m.title} className="w-16 h-24 object-cover rounded-lg border border-slate-700" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{m.title}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${m.is_published ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                        {m.is_published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">{m.synopsis}</p>
                    <div className="text-[11px] text-slate-500 mt-2">{m.genre} • {m.duration_minutes} Mins • {m.language}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: SCREENINGS */}
        {tab === 'screenings' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-4">Schedule Screening</h3>
              <form onSubmit={handleCreateScreening} className="flex flex-col gap-3 text-xs">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Select Movie</label>
                  <select
                    value={newScreening.movie_id}
                    onChange={(e) => setNewScreening({ ...newScreening, movie_id: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  >
                    {movies.map((m) => (
                      <option key={m.id} value={m.id}>{m.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={newScreening.screening_date.substring(0, 16)}
                    onChange={(e) => setNewScreening({ ...newScreening, screening_date: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Start Time</label>
                    <input
                      type="text"
                      required
                      value={newScreening.start_time}
                      onChange={(e) => setNewScreening({ ...newScreening, start_time: e.target.value })}
                      placeholder="18:30"
                      className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">End Time</label>
                    <input
                      type="text"
                      required
                      value={newScreening.end_time}
                      onChange={(e) => setNewScreening({ ...newScreening, end_time: e.target.value })}
                      placeholder="21:00"
                      className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="mt-2 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 font-bold text-white transition cursor-pointer"
                >
                  Create Screening (Init 821 Seats)
                </button>
              </form>
            </div>

            <div className="md:col-span-7 flex flex-col gap-4">
              <h3 className="text-base font-bold text-white">Active Screenings</h3>
              {screenings.map((s) => (
                <div key={s.id} className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-white">{s.movie?.title || 'Screening'}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {new Date(s.screening_date).toLocaleDateString()} • {s.start_time} - {s.end_time}
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300">
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: BATCHES */}
        {tab === 'batches' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-4">Register Student Batch</h3>
              <form onSubmit={handleCreateBatch} className="flex flex-col gap-3 text-xs">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Batch Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ME-2026-C"
                    value={newBatch.name}
                    onChange={(e) => setNewBatch({ ...newBatch, name: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Description</label>
                  <input
                    type="text"
                    value={newBatch.description}
                    onChange={(e) => setNewBatch({ ...newBatch, description: e.target.value })}
                    placeholder="Mechanical Engineering Section C"
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="mt-2 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 font-bold text-white transition cursor-pointer"
                >
                  Create Batch
                </button>
              </form>
            </div>

            <div className="md:col-span-7 flex flex-col gap-3">
              <h3 className="text-base font-bold text-white">Existing Batches</h3>
              {batches.map((b) => (
                <div key={b.id} className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-sm text-white">{b.name}</div>
                    <div className="text-xs text-slate-400">{b.description || 'No description'}</div>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300">
                    Active
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: BATCH-TARGETED NOTIFICATIONS */}
        {tab === 'notifications' && (
          <div className="max-w-2xl bg-slate-900/90 border border-slate-800 rounded-2xl p-6 mx-auto w-full">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-400" />
              Dispatch Batch-Targeted Student Notification
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Only students enrolled in the targeted batches will receive this in their personal dashboard feeds.
            </p>

            <form onSubmit={handleSendNotification} className="flex flex-col gap-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Notification Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP Front-Tier Access Open"
                  value={notifForm.title}
                  onChange={(e) => setNotifForm({ ...notifForm, title: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Message Body</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Enter announcements, seat instructions, or batch details..."
                  value={notifForm.body}
                  onChange={(e) => setNotifForm({ ...notifForm, body: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-2">Target Audience Selection</label>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    id="targetAll"
                    checked={notifForm.target_all}
                    onChange={(e) => setNotifForm({ ...notifForm, target_all: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="targetAll" className="text-slate-300 font-medium">Broadcast to All Students</label>
                </div>

                {!notifForm.target_all && (
                  <div className="flex flex-wrap gap-2">
                    {batches.map((b) => {
                      const isSelected = notifForm.batch_ids.includes(b.id);
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setNotifForm({ ...notifForm, batch_ids: notifForm.batch_ids.filter((id) => id !== b.id) });
                            } else {
                              setNotifForm({ ...notifForm, batch_ids: [...notifForm.batch_ids, b.id] });
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition ${
                            isSelected
                              ? 'bg-amber-600 border-amber-500 text-white'
                              : 'bg-slate-800 border-slate-700 text-slate-300'
                          }`}
                        >
                          {b.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="mt-2 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 font-bold text-white transition shadow-lg shadow-amber-600/30 cursor-pointer"
              >
                Dispatch Announcement
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};
