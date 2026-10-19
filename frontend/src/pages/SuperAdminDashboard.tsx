import React, { useState, useEffect } from 'react';
import { ShieldAlert, Users, Film, Sliders, FileText, LogOut, CheckCircle, AlertCircle, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { User, AuditLog } from '../types';

export const SuperAdminDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const { user, token } = useAuth();
  const [tab, setTab] = useState<'users' | 'audit' | 'config' | 'override'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New user form
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    display_name: '',
    role: 'student',
    batch_id: undefined as number | undefined,
    is_active: true,
  });

  // Seat override state
  const [overrideForm, setOverrideForm] = useState({
    screening_id: 1,
    seat_id: 1,
    new_status: 'available',
  });

  const fetchSuperData = async () => {
    try {
      const [uRes, aRes] = await Promise.all([
        fetch('/api/super-admin/users', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
        fetch('/api/super-admin/audit-logs', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      ]);
      setUsers(uRes || []);
      setAuditLogs(aRes || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSuperData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await fetch('/api/super-admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to create user');
      setMessage({ type: 'success', text: `User ${newUser.username} (${newUser.role}) created successfully!` });
      setNewUser({ username: '', password: '', display_name: '', role: 'student', batch_id: undefined, is_active: true });
      fetchSuperData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleOverrideSeat = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      const queryParams = new URLSearchParams({
        screening_id: String(overrideForm.screening_id),
        seat_id: String(overrideForm.seat_id),
        new_status: overrideForm.new_status,
      });
      const res = await fetch(`/api/super-admin/corrections/override-seat-status?${queryParams.toString()}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to override seat');
      setMessage({ type: 'success', text: data.message });
      fetchSuperData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0d12] text-slate-100 flex flex-col selection:bg-purple-500 selection:text-white">
      {/* Header */}
      <header className="bg-slate-900/90 border-b border-purple-900/40 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-600/30">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">Super-Admin Governance Console</h1>
            <p className="text-xs text-purple-400">Master Authority: {user?.display_name}</p>
          </div>
        </div>

        <nav className="flex items-center gap-2">
          {(['users', 'audit', 'override'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setMessage(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition cursor-pointer ${
                tab === t
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {t === 'users' ? 'User Directory' : t === 'audit' ? 'Audit Trail' : 'Seat Correction'}
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

      {/* Main Container */}
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

        {/* TAB 1: USERS */}
        {tab === 'users' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" /> Create System User
              </h3>
              <form onSubmit={handleCreateUser} className="flex flex-col gap-3 text-xs">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Username / ID</label>
                  <input
                    type="text"
                    required
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Display Name</label>
                  <input
                    type="text"
                    required
                    value={newUser.display_name}
                    onChange={(e) => setNewUser({ ...newUser, display_name: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Initial Password</label>
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Assigned Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="mt-2 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 font-bold text-white transition cursor-pointer"
                >
                  Create & Authorize Account
                </button>
              </form>
            </div>

            <div className="md:col-span-7 flex flex-col gap-3">
              <h3 className="text-base font-bold text-white">All System Accounts ({users.length})</h3>
              <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-2">
                {users.map((u) => (
                  <div key={u.id} className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-white">{u.display_name} <span className="text-slate-400 font-mono font-normal">(@{u.username})</span></div>
                      <div className="text-[11px] text-slate-500 mt-0.5">ID: #{u.id} • Batch ID: {u.batch_id || 'None'}</div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                      u.role === 'super_admin' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                      u.role === 'admin' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                      u.role === 'teacher' ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                      'bg-slate-800 text-slate-300'
                    }`}>
                      {u.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AUDIT LOGS */}
        {tab === 'audit' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" /> Immutable System Audit Trail
            </h3>
            <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs flex flex-col gap-1">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="font-mono text-amber-400 font-semibold">{log.action}</span>
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="text-white font-medium">{log.details || 'Action logged'}</div>
                  <div className="text-[11px] text-slate-500">
                    Actor: <strong className="text-slate-300">{log.actor_username || 'System'}</strong> | Target: {log.target_entity} ({log.target_id})
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: SEAT CORRECTIONS */}
        {tab === 'override' && (
          <div className="max-w-xl bg-slate-900/90 border border-slate-800 rounded-2xl p-6 mx-auto w-full">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-purple-400" /> Administrative Seat Override
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Safely release stuck holds, clear erroneous reservations, or block damaged chairs without deleting screenings.
            </p>

            <form onSubmit={handleOverrideSeat} className="flex flex-col gap-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Screening ID</label>
                <input
                  type="number"
                  required
                  value={overrideForm.screening_id}
                  onChange={(e) => setOverrideForm({ ...overrideForm, screening_id: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Seat ID (1 to 821)</label>
                <input
                  type="number"
                  required
                  value={overrideForm.seat_id}
                  onChange={(e) => setOverrideForm({ ...overrideForm, seat_id: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Target Status</label>
                <select
                  value={overrideForm.new_status}
                  onChange={(e) => setOverrideForm({ ...overrideForm, new_status: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                >
                  <option value="available">Available (Release Seat)</option>
                  <option value="blocked">Blocked (Maintenance / Inoperable)</option>
                  <option value="booked">Booked (Administrative Reserve)</option>
                </select>
              </div>

              <button
                type="submit"
                className="mt-2 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-white transition shadow-lg shadow-purple-600/30 cursor-pointer"
              >
                Execute Safe Correction
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};
