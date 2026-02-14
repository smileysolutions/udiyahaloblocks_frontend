import { useMemo, useState } from "react";
import { Modal } from "./Modal";

type Props = {
  open: boolean;
  onClose: () => void;
  reminderDates: string[];
};

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const CalendarModal = ({ open, onClose, reminderDates }: Props) => {
  const [current, setCurrent] = useState(new Date());

  const monthDays = useMemo(() => {
    const start = new Date(current.getFullYear(), current.getMonth(), 1);
    const end = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    const total = end.getDate();
    const offset = start.getDay();
    const dates: (number | null)[] = [];
    for (let i = 0; i < offset; i += 1) dates.push(null);
    for (let d = 1; d <= total; d += 1) dates.push(d);
    return dates;
  }, [current]);

  const reminderSet = useMemo(() => new Set(reminderDates), [reminderDates]);

  const formatDate = (day: number) => {
    const month = String(current.getMonth() + 1).padStart(2, "0");
    const date = String(day).padStart(2, "0");
    return `${current.getFullYear()}-${month}-${date}`;
  };

  return (
    <Modal open={open} onClose={onClose} className="max-w-md">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setCurrent(new Date(current.getFullYear(), current.getMonth() - 1, 1))}>
            ◀
          </button>
          <div className="font-semibold">
            {current.toLocaleString("default", { month: "long" })} {current.getFullYear()}
          </div>
          <button onClick={() => setCurrent(new Date(current.getFullYear(), current.getMonth() + 1, 1))}>
            ▶
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400">
          {days.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-sm">
          {monthDays.map((d, idx) => (
            <div key={`${d}-${idx}`} className="h-8">
              {d ? (
                <div
                  className={`flex h-8 items-center justify-center rounded-full ${
                    reminderSet.has(formatDate(d)) ? "bg-amber-100 text-amber-700" : "text-slate-700"
                  }`}
                >
                  {d}
                </div>
              ) : (
                <div />
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};
