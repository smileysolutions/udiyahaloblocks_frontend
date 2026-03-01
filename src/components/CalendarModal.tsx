import { useMemo, useState } from "react";
import { Modal } from "./Modal";
import type { Transaction } from "../api/types";

type Props = {
  open: boolean;
  onClose: () => void;
  transactions: Transaction[];
  onNavigate: (id: string, type: "buy" | "sell") => void;
};

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const CalendarModal = ({ open, onClose, transactions, onNavigate }: Props) => {
  const [current, setCurrent] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const monthDays = useMemo(() => {
    const start = new Date(current.getFullYear(), current.getMonth(), 1);
    const end = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    const total = end.getDate();
    const offset = start.getDay();
    const result: (number | null)[] = [];
    for (let i = 0; i < offset; i += 1) result.push(null);
    for (let d = 1; d <= total; d += 1) result.push(d);
    return result;
  }, [current]);

  const formatDate = (day: number) => {
    const month = String(current.getMonth() + 1).padStart(2, "0");
    const date = String(day).padStart(2, "0");
    return `${current.getFullYear()}-${month}-${date}`;
  };

  const dayEventsMap = useMemo(() => {
    const map: Record<string, Transaction[]> = {};
    transactions.forEach((t) => {
      if (t.status === "booked" && t.promiseDate) {
        if (!map[t.promiseDate]) map[t.promiseDate] = [];
        map[t.promiseDate].push(t);
      }
    });
    return map;
  }, [transactions]);

  const selectedDateEvents = useMemo(() => {
    if (selectedDay === null) return [];
    return dayEventsMap[formatDate(selectedDay)] || [];
  }, [selectedDay, dayEventsMap, current]);

  const totalPendingSelected = selectedDateEvents.reduce((acc, t) => acc + (t.amount - (t.paidAmount || 0)), 0);

  return (
    <Modal open={open} onClose={onClose} className="max-w-md">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
            onClick={() => {
              setCurrent(new Date(current.getFullYear(), current.getMonth() - 1, 1));
              setSelectedDay(null);
            }}
          >
            <i className="fas fa-chevron-left"></i>
          </button>
          <div className="udh-font-heading text-lg font-bold text-slate-800">
            {current.toLocaleString("default", { month: "long" })} {current.getFullYear()}
          </div>
          <button
            className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
            onClick={() => {
              setCurrent(new Date(current.getFullYear(), current.getMonth() + 1, 1));
              setSelectedDay(null);
            }}
          >
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {days.map((d) => (
            <div key={d} className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{d}</div>
          ))}
          {monthDays.map((d, idx) => {
            const dateStr = d ? formatDate(d) : "";
            const events = d ? dayEventsMap[dateStr] : [];
            const hasEvents = events && events.length > 0;
            const isToday = d && formatDate(d) === new Date().toISOString().split("T")[0];
            const isSelected = selectedDay === d;

            return (
              <div key={`${d}-${idx}`} className="relative h-10 w-full flex justify-center">
                {d ? (
                  <button
                    onClick={() => setSelectedDay(d)}
                    className={`flex flex-col h-10 w-10 items-center justify-center rounded-xl transition-all ${isSelected
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105"
                        : isToday
                          ? "bg-indigo-50 text-indigo-700 font-bold border border-indigo-100"
                          : "text-slate-700 hover:bg-slate-50 font-semibold"
                      }`}
                  >
                    <span className="text-sm">{d}</span>
                    {hasEvents && !isSelected && (
                      <div className="flex gap-0.5 mt-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-500"></span>
                      </div>
                    )}
                  </button>
                ) : (
                  <div />
                )}
              </div>
            );
          })}
        </div>

        {selectedDay && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300 border-t border-slate-100 pt-4">
            <div className="flex justify-between items-center mb-3">
              <div className="text-[11px] font-black text-slate-400 uppercase tracking-[2px]">
                EVENTS ON {formatDate(selectedDay)}
              </div>
              <div className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                TOTAL: ₹{totalPendingSelected.toLocaleString()}
              </div>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {selectedDateEvents.length > 0 ? (
                selectedDateEvents.map((t) => (
                  <button
                    key={t._id}
                    onClick={() => onNavigate(t._id, t.type)}
                    className="flex w-full items-center justify-between rounded-xl bg-slate-50 p-3 text-left border border-slate-100 hover:bg-indigo-50 hover:border-indigo-100 transition-all group"
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-800 group-hover:text-indigo-700">{t.name}</div>
                      <div className="text-[9px] font-bold mt-1 px-1.5 py-0.5 rounded inline-block uppercase tracking-wider text-slate-500 bg-slate-200">{t.type}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-black ${t.type === 'buy' ? 'text-rose-600' : 'text-emerald-600'}`}>
                        ₹{(t.amount - (t.paidAmount || 0)).toLocaleString()}
                      </div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase mt-1">Pending</div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-6 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <i className="fas fa-calendar-check text-slate-200 text-2xl mb-2"></i>
                  <div className="text-xs text-slate-400 font-medium">No events scheduled for this day</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
