import { create } from "zustand";
import { v4 as uuid } from "uuid";

export type Triumph = {
  id: string;
  date: string;
  items: string[];
};

interface State {
  triumphs: Triumph[];
  add: (items: string[]) => void;
  remove: (id: string) => void;
}

export const useTriumphStore = create<State>((set) => ({
  triumphs: JSON.parse(localStorage.getItem("triumphs") || "[]"),
  add: (items) =>
    set((s) => {
      const t = {
        id: uuid(),
        date: new Date().toISOString().slice(0, 10),
        items,
      };
      const next = [...s.triumphs, t];
      localStorage.setItem("triumphs", JSON.stringify(next));
      return { triumphs: next };
    }),
  remove: (id) =>
    set((s) => {
      const next = s.triumphs.filter((t) => t.id !== id);
      localStorage.setItem("triumphs", JSON.stringify(next));
      return { triumphs: next };
    }),
}));
