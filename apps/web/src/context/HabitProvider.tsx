import { format, parseISO } from "date-fns";
import { useEffect, useState, type ReactNode } from "react";
import { HabitContext, type Habit } from "./useHabits";
import {
  createHabit,
  deleteHabitRequest,
  getHabits,
  toggleHabitCompletion,
  type ApiHabit,
} from "../api/habitsApi";

export type HabitProviderProps = {
  children: ReactNode;
};

function mapApiHabit(apiHabit: ApiHabit): Habit {
  return {
    id: apiHabit.id,
    name: apiHabit.name,
    completions: apiHabit.completions.map((e) => parseISO(e)),
  };
}

export function HabitProvider({ children }: HabitProviderProps) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHabits() {
      try {
        setIsLoading(true);
        setError(null);

        const apiHabits = await getHabits();
        setHabits(apiHabits.map(mapApiHabit));
      } catch {
        setError("Could not load habits");
      } finally {
        setIsLoading(false);
      }
    }

    loadHabits();
  }, []);

  async function addHabit(name: string) {
    const habit = mapApiHabit(await createHabit(name));

    setHabits((curr) => [...curr, habit]);
  }

  async function deleteHabit(id: string) {
    await deleteHabitRequest(id);

    setHabits((curr) => curr.filter((el) => el.id != id));
  }

  async function toggleHabit(id: string, date: Date) {
    const dateString = format(date, "yyyy-MM-dd");
    const habit = mapApiHabit(await toggleHabitCompletion(id, dateString));

    setHabits((curr) => curr.map((e) => (e.id == habit.id ? habit : e)));
  }

  return (
    <HabitContext
      value={{ habits, addHabit, toggleHabit, deleteHabit, isLoading, error }}
    >
      {children}
    </HabitContext>
  );
}
