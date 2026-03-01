import { useState, useEffect, useCallback, useRef } from "react";

export const CalculatorWidget = () => {
  const [value, setValue] = useState("0");
  const [history, setHistory] = useState<string[]>([]);
  const [isSleeping, setIsSleeping] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Dragging State
  const [position, setPosition] = useState({ x: window.innerWidth - 300, y: window.innerHeight - 450 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const resetTimer = useCallback(() => {
    setLastActivity(Date.now());
    if (isSleeping) setIsSleeping(false);
  }, [isSleeping]);

  useEffect(() => {
    const interval = setInterval(() => {
      // Don't sleep while dragging
      if (Date.now() - lastActivity > 10000 && !isSleeping && !isDragging) {
        setIsSleeping(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lastActivity, isSleeping, isDragging]);

  // Dragging Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    resetTimer();
    // Use setPointerCapture to ensure all subsequent pointer events target this element even if the pointer slides off
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (isDragging) {
      resetTimer();
      // Keep widget within bounds roughly
      let newX = e.clientX - dragOffset.current.x;
      let newY = e.clientY - dragOffset.current.y;

      const maxX = window.innerWidth - 280; // approx width
      const maxY = window.innerHeight - 50; // approx height of header

      if (newX < 0) newX = 0;
      if (newY < 0) newY = 0;
      if (newX > maxX) newX = maxX;
      if (newY > maxY) newY = maxY;

      setPosition({ x: newX, y: newY });
    }
  }, [isDragging, resetTimer]);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {
      // Ignore
    }
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    } else {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    }
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);


  const input = (v: string) => {
    resetTimer();
    setValue((prev) => (prev === "0" ? v : prev + v));
  };

  const clear = () => {
    resetTimer();
    setValue("0");
  };

  const back = () => {
    resetTimer();
    setValue((prev) => (prev.length > 1 ? prev.slice(0, -1) : "0"));
  };

  const calculate = () => {
    resetTimer();
    try {
      const result = Function(`return (${value})`)();
      const newStr = String(result);
      if (value !== "0" && newStr !== "Error") {
        setHistory((h) => [`${value} = ${newStr}`, ...h].slice(0, 3));
      }
      setValue(newStr);
    } catch {
      setValue("Error");
    }
  };

  if (isSleeping) {
    return (
      <div
        className="fixed bottom-6 right-0 z-[100] flex h-14 w-12 cursor-pointer items-center justify-center rounded-l-xl bg-orange-500/80 text-white shadow-xl backdrop-blur-sm transition-all hover:w-14"
        onClick={resetTimer}
        onMouseMove={resetTimer}
        title="Wake Calculator"
      >
        <i className="fas fa-calculator text-xl animate-pulse"></i>
      </div>
    );
  }

  return (
    <div
      className="fixed z-[100] w-72 rounded-xl bg-white shadow-2xl transition-opacity duration-300"
      style={{ left: `${position.x}px`, top: `${position.y}px`, cursor: isDragging ? 'grabbing' : 'auto' }}
      onMouseMove={resetTimer}
      onClick={resetTimer}
    >
      <div
        className="flex cursor-grab active:cursor-grabbing items-center justify-center rounded-t-xl bg-slate-900 px-4 py-3 text-white select-none relative touch-none"
        onPointerDown={handlePointerDown}
      >
        <div className="absolute left-3 text-slate-500 text-[10px]"><i className="fas fa-grip-lines"></i></div>
        <div className="text-[10px] font-black uppercase tracking-widest text-[#f59e0b] pointer-events-none">
          Pro Calculator
        </div>
      </div>
      <div className="p-4 flex flex-col gap-3">
        {history.length > 0 && (
          <div className="flex flex-col gap-1 rounded-lg bg-slate-50 p-2 text-right text-xs text-slate-400">
            {history.map((h, i) => (
              <div key={i} className="truncate">{h}</div>
            ))}
          </div>
        )}
        <div className="rounded-xl bg-slate-100 p-3 text-right text-2xl font-black text-slate-800 tracking-tight break-all">
          {value}
        </div>
        <div className="grid grid-cols-4 gap-2 text-sm font-bold">
          <button className="rounded-xl bg-orange-100 text-orange-600 py-2 hover:bg-orange-200 transition-colors" onClick={clear}>AC</button>
          <button className="rounded-xl bg-slate-100 text-slate-600 py-2 hover:bg-slate-200 transition-colors" onClick={back}>⌫</button>
          <button className="rounded-xl bg-slate-100 text-slate-600 py-2 hover:bg-slate-200 transition-colors" onClick={() => input("%")}>%</button>
          <button className="rounded-xl bg-indigo-50 text-indigo-600 py-2 hover:bg-indigo-100 transition-colors" onClick={() => input("/")}>÷</button>

          {[7, 8, 9].map((n) => (
            <button key={n} className="rounded-xl bg-white border border-slate-100 text-slate-800 py-2 hover:bg-slate-50 transition-colors shadow-sm" onClick={() => input(String(n))}>{n}</button>
          ))}
          <button className="rounded-xl bg-indigo-50 text-indigo-600 py-2 hover:bg-indigo-100 transition-colors" onClick={() => input("*")}>×</button>

          {[4, 5, 6].map((n) => (
            <button key={n} className="rounded-xl bg-white border border-slate-100 text-slate-800 py-2 hover:bg-slate-50 transition-colors shadow-sm" onClick={() => input(String(n))}>{n}</button>
          ))}
          <button className="rounded-xl bg-indigo-50 text-indigo-600 py-2 hover:bg-indigo-100 transition-colors" onClick={() => input("-")}>-</button>

          {[1, 2, 3].map((n) => (
            <button key={n} className="rounded-xl bg-white border border-slate-100 text-slate-800 py-2 hover:bg-slate-50 transition-colors shadow-sm" onClick={() => input(String(n))}>{n}</button>
          ))}
          <button className="rounded-xl bg-indigo-50 text-indigo-600 py-2 hover:bg-indigo-100 transition-colors" onClick={() => input("+")}>+</button>

          <button className="col-span-2 rounded-xl bg-white border border-slate-100 text-slate-800 py-2 hover:bg-slate-50 transition-colors shadow-sm" onClick={() => input("0")}>0</button>
          <button className="rounded-xl bg-white border border-slate-100 text-slate-800 py-2 hover:bg-slate-50 transition-colors shadow-sm" onClick={() => input(".")}>.</button>
          <button className="col-span-1 rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-500/30 py-2 hover:bg-orange-600 transition-colors" onClick={calculate}>=</button>
        </div>
      </div>
    </div>
  );
};
