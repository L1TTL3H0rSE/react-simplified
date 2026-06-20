import express from "express";
import cors from "cors";

export type Habit = { id: string; name: string; completions: string[] };

const app = express();
const port = 3000;

app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/health", (req, res) => {
  res.status(200).send({ ok: true });
});

let habits: Habit[] = [];

app.get("/api/habits", (req, res) => {
  res.status(200).send(habits);
});

app.post("/api/habits", (req, res) => {
  const habit = req.body as Omit<Habit, "id" | "completions">;
  const newHabit: Habit = {
    ...habit,
    id: crypto.randomUUID(),
    completions: [],
  };
  habits.push(newHabit);
  res.status(201).send(newHabit);
});

app.delete("/api/habits/:id", (req, res) => {
  const { id } = req.params;
  habits = habits.filter((e) => e.id != id);
  res.status(204).send();
});

//эти оставлю просто как вариант, чтобы потестить в insomnia
app.post("/api/habits/:id/completions", (req, res) => {
  const { id } = req.params;
  const { date } = req.body;
  const habitIndex = habits.findIndex((e) => e.id == id);
  if (habitIndex == -1) {
    res.status(404).send("No such id found!");
    return;
  }
  const dateIndex = habits[habitIndex].completions.findIndex((e) => e == date);
  if (dateIndex != -1) {
    res.status(409).send();
    return;
  }
  habits[habitIndex].completions.push(date);
  res.status(201).send(habits[habitIndex]);
});

app.delete("/api/habits/:id/completions/:date", (req, res) => {
  const { id, date } = req.params;
  const habitIndex = habits.findIndex((e) => e.id == id);
  if (habitIndex == -1) {
    res.status(404).send("No such id found!");
    return;
  }
  habits[habitIndex].completions = habits[habitIndex].completions.filter(
    (e) => e != date,
  );
  res.status(204).send();
});

//но буду использовать тоггл в реакте
app.post("/api/habits/:id/toggle-completion/:date", (req, res) => {
  const { id, date } = req.params;
  const habitIndex = habits.findIndex((e) => e.id == id);
  if (habitIndex == -1) {
    res.status(404).send("No such id found!");
    return;
  }
  const dateIndex = habits[habitIndex].completions.findIndex((e) => e == date);
  if (dateIndex == -1) {
    habits[habitIndex].completions.push(date);
    res.status(201).send(habits[habitIndex]);
    return;
  }
  habits[habitIndex].completions = habits[habitIndex].completions.filter(
    (e) => e != date,
  );
  res.status(204).send();
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
