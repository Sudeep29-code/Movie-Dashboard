import React, { useMemo } from 'react';
import { SeatInventory } from '../types';

interface SeatMapProps {
  seats: SeatInventory[];
  selectedSeatIds: number[];
  onToggleSeat: (seat: SeatInventory) => void;
  maxSelection?: number;
  userRole?: string;
}

export const SeatMap: React.FC<SeatMapProps> = ({
  seats,
  selectedSeatIds,
  onToggleSeat,
  maxSelection = 1,
  userRole = 'student',
}) => {
  // Group seats by row
  const rows = useMemo(() => {
    const grouped: { [row: string]: SeatInventory[] } = {};
    seats.forEach((seat) => {
      if (!grouped[seat.row_label]) {
        grouped[seat.row_label] = [];
      }
      grouped[seat.row_label].push(seat);
    });

    // Sort rows alphabetically, with double letters (AA, BB) at the end
    const sortedRowKeys = Object.keys(grouped).sort((a, b) => {
      if (a.length !== b.length) return a.length - b.length;
      return a.localeCompare(b);
    });

    return sortedRowKeys.map((rowLabel) => ({
      rowLabel,
      tier: grouped[rowLabel][0]?.tier || 'Standard',
      seats: grouped[rowLabel].sort((a, b) => a.seat_number - b.seat_number),
    }));
  }, [seats]);

  const getSeatColor = (seat: SeatInventory) => {
    const isSelected = selectedSeatIds.includes(seat.seat_id);

    if (isSelected) {
      return 'bg-amber-500 text-black border-amber-300 font-bold scale-110 shadow-lg shadow-amber-500/50';
    }

    switch (seat.status) {
      case 'available':
        if (seat.tier === 'VIP') {
          return 'bg-purple-950/70 border-purple-500/50 text-purple-200 hover:bg-purple-800 hover:border-purple-300';
        }
        if (seat.tier.includes('Balcony')) {
          return 'bg-blue-950/70 border-blue-500/50 text-blue-200 hover:bg-blue-800 hover:border-blue-300';
        }
        return 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-red-700/60 hover:border-red-400';

      case 'booked':
        return 'bg-red-950/40 border-red-900/40 text-red-500/40 cursor-not-allowed line-through';

      case 'held':
        return 'bg-yellow-950/50 border-yellow-700/50 text-yellow-500 cursor-not-allowed';

      case 'blocked':
        return 'bg-gray-900 border-gray-800 text-gray-600 cursor-not-allowed';

      default:
        return 'bg-slate-800 border-slate-700';
    }
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 md:p-6 shadow-2xl backdrop-blur-md">
      {/* Stage / Screen Visualizer */}
      <div className="flex flex-col items-center mb-10">
        <div className="w-3/4 h-3 bg-gradient-to-r from-transparent via-red-500 to-transparent rounded-full shadow-lg shadow-red-500/30 mb-2"></div>
        <span className="text-xs tracking-widest text-slate-400 uppercase font-semibold">Cinema Screen / Stage</span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs mb-8 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-slate-800 border border-slate-700 inline-block"></span>
          <span className="text-slate-400">Standard Available</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-purple-950 border border-purple-500 text-purple-200 inline-block"></span>
          <span className="text-purple-300">VIP</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-blue-950 border border-blue-500 text-blue-200 inline-block"></span>
          <span className="text-blue-300">Balcony</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-amber-500 border border-amber-300 inline-block shadow-sm"></span>
          <span className="text-amber-300 font-medium">Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-red-950/40 border border-red-900/40 inline-block"></span>
          <span className="text-red-400/60">Booked</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-gray-900 border border-gray-800 inline-block"></span>
          <span className="text-gray-500">Blocked</span>
        </div>
      </div>

      {/* Auditorium Map (Supports Scroll for 800+ seats) */}
      <div className="overflow-x-auto pb-6">
        <div className="min-w-[900px] flex flex-col gap-2 items-center">
          {rows.map(({ rowLabel, tier, seats: rowSeats }) => (
            <div key={rowLabel} className="flex items-center gap-2">
              <span className="w-8 text-right font-mono text-xs font-bold text-slate-500 select-none">
                {rowLabel}
              </span>

              <div className="flex items-center gap-1">
                {rowSeats.map((seat, idx) => {
                  const isAisle = (rowSeats.length >= 25 && (idx === 6 || idx === rowSeats.length - 7));
                  return (
                    <React.Fragment key={seat.seat_id}>
                      <button
                        type="button"
                        onClick={() => seat.status === 'available' && onToggleSeat(seat)}
                        disabled={seat.status !== 'available'}
                        title={`${seat.seat_label} (${seat.tier}) - ${seat.status}`}
                        className={`w-6 h-6 rounded text-[10px] font-mono border transition-all duration-150 flex items-center justify-center select-none ${getSeatColor(
                          seat
                        )}`}
                      >
                        {seat.seat_number}
                      </button>
                      {isAisle && <div className="w-4" />}
                    </React.Fragment>
                  );
                })}
              </div>

              <span className="w-8 text-left font-mono text-xs font-bold text-slate-500 select-none">
                {rowLabel}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Selection Notice */}
      <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400">
        <div>
          Role Limit:{' '}
          <span className="text-white font-medium">
            {userRole === 'student' ? '1 seat max' : `Up to ${maxSelection} seats`}
          </span>
        </div>
        <div>
          Selected:{' '}
          <span className="text-amber-400 font-bold">{selectedSeatIds.length} seat(s)</span>
        </div>
      </div>
    </div>
  );
};
