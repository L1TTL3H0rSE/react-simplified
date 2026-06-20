import express from "express";
import cors from "cors";
import z from "zod";

export type Habit = { id: string; name: string; completions: string[] };

const createHabitBodySchema = z.object({
  name: z.string().trim().min(1),
});
const idParamsSchema = z.object({
  id: z.uuid(),
});
const completionBodySchema = z.object({
  date: z.iso.date(),
});
const completionParamsSchema = z.object({
  id: z.uuid(),
});
const habitDateParamsSchema = z.object({
  id: z.uuid(),
  date: z.iso.date(),
});
const toggleCompletionParamSchema = z.object({
  id: z.uuid(),
  date: z.iso.date(),
});

const app = express();
const port = 3000;

app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).send({ ok: true });
});

let habits: Habit[] = [];

app.get("/api/habits", (req, res) => {
  res.status(200).send(habits);
});

app.post("/api/habits", (req, res) => {
  const body = createHabitBodySchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).send({
      error: "Invalid request body",
      issues: body.error.issues,
    });
    return;
  }
  const { name } = body.data;

  const newHabit: Habit = {
    id: crypto.randomUUID(),
    name,
    completions: [],
  };
  habits.push(newHabit);
  res.status(201).send(newHabit);
});

app.delete("/api/habits/:id", (req, res) => {
  const params = idParamsSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).send({
      error: "Invalid request params",
      issues: params.error.issues,
    });
    return;
  }
  const { id } = params.data;

  habits = habits.filter((e) => e.id != id);
  res.status(204).send();
});

//эти оставлю просто как вариант, чтобы потестить в insomnia
app.post("/api/habits/:id/completions", (req, res) => {
  const params = completionParamsSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).send({
      error: "Invalid request params",
      issues: params.error.issues,
    });
    return;
  }
  const { id } = params.data;

  const body = completionBodySchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).send({
      error: "Invalid request body",
      issues: body.error.issues,
    });
    return;
  }
  const { date } = body.data;

  const habitIndex = habits.findIndex((e) => e.id == id);

  if (habitIndex == -1) {
    res.status(404).send("Habit not found");
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
  const params = habitDateParamsSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).send({
      error: "Invalid request params",
      issues: params.error.issues,
    });
    return;
  }
  const { id, date } = params.data;

  const habitIndex = habits.findIndex((e) => e.id == id);
  if (habitIndex == -1) {
    res.status(404).send("Habit not found");
    return;
  }
  habits[habitIndex].completions = habits[habitIndex].completions.filter(
    (e) => e != date,
  );
  res.status(204).send();
});

//буду использовать тоггл ендпоинт реакте
app.post("/api/habits/:id/toggle-completion/:date", (req, res) => {
  const params = toggleCompletionParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).send({
      error: "Invalid request params",
      issues: params.error.issues,
    });
    return;
  }
  const { id, date } = params.data;

  const habitIndex = habits.findIndex((e) => e.id == id);
  if (habitIndex == -1) {
    res.status(404).send("Habit not found");
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
  res.status(201).send(habits[habitIndex]);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
