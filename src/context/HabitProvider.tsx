import { isSameDay } from "date-fns";
import { type ReactNode } from "react";
import { HabitContext, type Habit } from "./useHabits";
import { useLocalStorage } from "../hooks/useLocalStorage";

export type HabitProviderProps = {
  children: ReactNode;
};

export function HabitProvider({ children }: HabitProviderProps) {
  const [habits, setHabits] = useLocalStorage<Habit[]>("Habits", []);

  function addHabit(name: string) {
    setHabits((curr) => [
      ...curr,
      { id: crypto.randomUUID(), name, completions: [] },
    ]);
  }

  function deleteHabit(id: string) {
    setHabits((curr) => curr.filter((el) => el.id != id));
  }

  function toggleHabit(id: string, date: Date) {
    setHabits((curr) =>
      curr.map((e) => {
        if (e.id != id) return e;
        const alreadyDone = e.completions.some((c) => isSameDay(c, date));
        const completions = alreadyDone
          ? e.completions.filter((c) => !isSameDay(c, date))
          : [...e.completions, date];

        return { ...e, completions };
      }),
    );
  }

  return (
    <HabitContext value={{ habits, addHabit, toggleHabit, deleteHabit }}>
      {children}
    </HabitContext>
  );
}
