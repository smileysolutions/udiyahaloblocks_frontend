import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export const CalculatorWidget = ({ open, onClose }: Props) => {
  const [value, setValue] = useState("0");

  if (!open) return null;

  const input = (v: string) => {
    setValue((prev) => (prev === "0" ? v : prev + v));
  };

  const clear = () => setValue("0");
  const back = () => setValue((prev) => (prev.length > 1 ? prev.slice(0, -1) : "0"));

  const calculate = () => {
    try {
      const result = Function(`return (${value})`)();
      setValue(String(result));
    } catch {
      setValue("Error");
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-72 rounded-xl bg-white shadow-xl">
      <div className="flex items-center justify-between rounded-t-xl bg-slate-900 px-4 py-2 text-white">
        <div className="text-xs font-semibold">CALCULATOR</div>
        <button onClick={onClose}>✕</button>
      </div>
      <div className="p-4">
        <div className="mb-3 rounded-lg bg-slate-100 p-2 text-right text-lg">{value}</div>
        <div className="grid grid-cols-4 gap-2 text-sm">
          <button className="btn-calc" onClick={clear}>AC</button>
          <button className="btn-calc" onClick={back}>⌫</button>
          <button className="btn-calc" onClick={() => input("%")}>%</button>
          <button className="btn-calc" onClick={() => input("/")}>÷</button>
          {[7,8,9].map((n) => (
            <button key={n} className="btn-calc" onClick={() => input(String(n))}>{n}</button>
          ))}
          <button className="btn-calc" onClick={() => input("*")}>×</button>
          {[4,5,6].map((n) => (
            <button key={n} className="btn-calc" onClick={() => input(String(n))}>{n}</button>
          ))}
          <button className="btn-calc" onClick={() => input("-")}>-</button>
          {[1,2,3].map((n) => (
            <button key={n} className="btn-calc" onClick={() => input(String(n))}>{n}</button>
          ))}
          <button className="btn-calc" onClick={() => input("+")}>+</button>
          <button className="btn-calc col-span-2" onClick={() => input("0")}>0</button>
          <button className="btn-calc" onClick={() => input(".")}>.</button>
          <button className="btn-calc col-span-1 bg-indigo-600 text-white" onClick={calculate}>=</button>
        </div>
      </div>
    </div>
  );
};
