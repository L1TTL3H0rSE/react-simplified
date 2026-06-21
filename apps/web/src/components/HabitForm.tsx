import { useState, type SubmitEvent } from "react";
import { Button } from "./Button";
import { useHabits } from "../context/useHabits";

export function HabitForm() {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { addHabit } = useHabits();

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();

    if (name.trim() == "") return;

    try {
      setSubmitting(true);
      await addHabit(name);
    } finally {
      setSubmitting(false);
      setName("");
    }
  }

  return (
    <form className="flex gap-2" onSubmit={handleSubmit}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1 rounded-lg bg-zinc-800 px-4 py-2 outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        placeholder="New Habit..."
      />
      <Button
        disabled={name.trim() == "" || submitting}
        className="rounded-lg px-4 py-2 font-medium"
      >
        Add Habit
      </Button>
    </form>
  );
}
