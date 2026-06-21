import { createContext, useContext } from "react";

export type Habit = { id: string; name: string; completions: Date[] };

type Context = {
  habits: Habit[];
  isLoading: boolean;
  error: string | null;
  addHabit: (name: string) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  toggleHabit: (id: string, date: Date) => Promise<void>;
};

export const HabitContext = createContext<null | Context>(null);

export function useHabits() {
  const habitContext = useContext(HabitContext);
  if (habitContext == null) throw new Error("no context");
  return habitContext;
}
