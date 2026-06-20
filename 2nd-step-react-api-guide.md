# Этап 2: как подключить React к API

Этот документ объясняет, как перевести текущий `HabitProvider` с `localStorage` на запросы к `apps/api`.

Код ниже - учебные примеры. Не надо копировать все бездумно. Цель - понять роли файлов и руками перенести идею в проект.

## 1. Что гуглить

Полезные поисковые запросы:

- `React fetch data in useEffect TypeScript`
- `React context provider custom hook TypeScript`
- `React custom hook fetch data`
- `React controlled form submit TypeScript`
- `Express REST API fetch from React`
- `Vite React environment variables import.meta.env`
- `MDN fetch API json POST`
- `HTTP status codes REST API 201 204 400 404`
- `React server state vs client state`
- `TanStack Query React tutorial` - позже, не сейчас

Что читать в первую очередь:

- React docs: `useEffect`, `useState`, `createContext`, `useContext`;
- MDN Fetch API;
- Express routing docs;
- Zod parsing docs.

Пока не гугли tRPC, Redux, Zustand, TanStack Query как основное решение. Сейчас тебе нужно понять обычный путь:

```txt
click in React -> function from context -> fetch -> Express route -> memory array -> JSON response -> React state
```

## 2. Что у тебя уже есть

Backend сейчас хранит:

```ts
export type Habit = { id: string; name: string; completions: string[] };
```

Frontend сейчас ожидает:

```ts
export type Habit = { id: string; name: string; completions: Date[] };
```

Это важное отличие.

Почему так:

- по сети JSON не умеет передавать настоящие `Date`;
- backend отправляет даты как строки;
- frontend, если хочет использовать `isSameDay`, `isToday`, `format`, должен превратить строки обратно в `Date`.

Сейчас `useLocalStorage` делал это через `dateReviver`. После перехода на API это надо сделать явно.

## 3. Как думать про Context

Context - это способ не передавать props через много уровней.

Сейчас у тебя примерно так:

```txt
App
  HabitProvider
    Header
    HabitForm
    HabitList
      HabitItem
```

`HabitProvider` хранит данные и функции:

- `habits`;
- `addHabit`;
- `deleteHabit`;
- `toggleHabit`.

Компоненты не знают, откуда берутся habits:

- раньше из `localStorage`;
- теперь будут из API;
- позже из API + PostgreSQL;
- еще позже через TanStack Query.

Это хорошая архитектурная идея: компоненты не должны знать детали хранения.

## 4. Что такое custom hook `useHabits`

Файл `useHabits.ts` делает две вещи:

1. Создает `HabitContext`.
2. Дает удобный hook `useHabits()`.

Без helper hook компоненты должны были бы писать:

```tsx
const habitContext = useContext(HabitContext);

if (habitContext == null) {
  throw new Error("no context");
}
```

С helper hook компонент пишет короче:

```tsx
const { habits, addHabit } = useHabits();
```

То есть `useHabits` - это не магия. Это просто удобная обертка над `useContext`.

## 5. Рекомендуемая структура frontend-файлов

Я бы сделал так:

```txt
apps/web/src/
  api/
    habitsApi.ts
  context/
    HabitProvider.tsx
    useHabits.ts
  components/
    Header.tsx
    HabitForm.tsx
    HabitList.tsx
```

Зачем нужен `api/habitsApi.ts`:

- чтобы не писать `fetch("http://localhost:3000/...")` прямо в компонентах;
- чтобы вся работа с API была в одном месте;
- чтобы provider был проще читать.

Компоненты должны оставаться тупыми:

- `HabitForm` собирает имя и вызывает `addHabit(name)`;
- `HabitList` рисует привычки;
- `HabitItem` вызывает `toggleHabit(id, date)` и `deleteHabit(id)`;
- `Header` считает `doneToday`.

## 6. API layer: пример `habitsApi.ts`

Этот файл отвечает только за HTTP.

Пример:

```ts
const API_URL = "http://localhost:3000";

export type ApiHabit = {
  id: string;
  name: string;
  completions: string[];
};

export async function getHabits(): Promise<ApiHabit[]> {
  const response = await fetch(`${API_URL}/api/habits`);

  if (!response.ok) {
    throw new Error("Failed to load habits");
  }

  return response.json();
}

export async function createHabit(name: string): Promise<ApiHabit> {
  const response = await fetch(`${API_URL}/api/habits`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw new Error("Failed to create habit");
  }

  return response.json();
}

export async function deleteHabitRequest(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/habits/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete habit");
  }
}

export async function toggleHabitCompletion(
  id: string,
  date: string,
): Promise<ApiHabit> {
  const response = await fetch(
    `${API_URL}/api/habits/${id}/toggle-completion/${date}`,
    {
      method: "POST",
    },
  );

  if (!response.ok) {
    throw new Error("Failed to toggle habit completion");
  }

  return response.json();
}
```

Важно:

- `response.ok` означает status code 200-299;
- `201 Created` тоже `ok`;
- `204 No Content` тоже `ok`, но у него нет JSON body;
- поэтому после `DELETE` нельзя делать `return response.json()`, если сервер отвечает `204`.

## 7. Преобразование API Habit в UI Habit

Backend отправляет даты строками:

```json
{
  "id": "...",
  "name": "Read",
  "completions": ["2026-06-21"]
}
```

Твой UI сейчас хочет:

```ts
{
  id: "...",
  name: "Read",
  completions: [Date]
}
```

Добавь mapper:

```ts
import { parseISO } from "date-fns";
import type { ApiHabit } from "../api/habitsApi";
import type { Habit } from "./useHabits";

function mapApiHabit(apiHabit: ApiHabit): Habit {
  return {
    id: apiHabit.id,
    name: apiHabit.name,
    completions: apiHabit.completions.map((date) => parseISO(date)),
  };
}
```

Можно держать этот mapper в `HabitProvider.tsx`, потому что это граница между API-моделью и UI-моделью.

## 8. Как должен измениться `useHabits.ts`

Сейчас функции синхронные:

```ts
addHabit: (name: string) => void;
deleteHabit: (id: string) => void;
toggleHabit: (id: string, date: Date) => void;
```

После API они станут async:

```ts
type Context = {
  habits: Habit[];
  isLoading: boolean;
  error: string | null;
  addHabit: (name: string) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  toggleHabit: (id: string, date: Date) => Promise<void>;
};
```

Почему:

- `fetch` работает асинхронно;
- запрос может идти долго;
- запрос может упасть;
- UI должен знать, идет загрузка или нет.

## 9. Как должен измениться `HabitProvider`

Раньше provider делал так:

```txt
state берется из localStorage
add/delete/toggle меняют local state
useLocalStorage сам сохраняет state
```

Теперь provider должен делать так:

```txt
при первом рендере загрузить habits с API
хранить habits в useState
add/delete/toggle отправляют fetch
после успешного ответа обновляют state
```

Примерная форма:

```tsx
import { useEffect, useState, type ReactNode } from "react";
import { format, parseISO } from "date-fns";
import {
  createHabit,
  deleteHabitRequest,
  getHabits,
  toggleHabitCompletion,
  type ApiHabit,
} from "../api/habitsApi";
import { HabitContext, type Habit } from "./useHabits";

export type HabitProviderProps = {
  children: ReactNode;
};

function mapApiHabit(apiHabit: ApiHabit): Habit {
  return {
    id: apiHabit.id,
    name: apiHabit.name,
    completions: apiHabit.completions.map((date) => parseISO(date)),
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
    const apiHabit = await createHabit(name);
    const habit = mapApiHabit(apiHabit);

    setHabits((currentHabits) => [...currentHabits, habit]);
  }

  async function deleteHabit(id: string) {
    await deleteHabitRequest(id);

    setHabits((currentHabits) =>
      currentHabits.filter((habit) => habit.id !== id),
    );
  }

  async function toggleHabit(id: string, date: Date) {
    const dateString = format(date, "yyyy-MM-dd");
    const apiHabit = await toggleHabitCompletion(id, dateString);
    const updatedHabit = mapApiHabit(apiHabit);

    setHabits((currentHabits) =>
      currentHabits.map((habit) =>
        habit.id === updatedHabit.id ? updatedHabit : habit,
      ),
    );
  }

  return (
    <HabitContext
      value={{
        habits,
        isLoading,
        error,
        addHabit,
        deleteHabit,
        toggleHabit,
      }}
    >
      {children}
    </HabitContext>
  );
}
```

Что здесь важно:

- `useEffect(..., [])` выполняет загрузку один раз после первого рендера provider;
- `try/catch/finally` нужен для loading/error;
- `setHabits` вызывается только после успешного ответа сервера;
- `toggleHabit` больше не решает сам, добавлять дату или удалять: это решает backend;
- `format(date, "yyyy-MM-dd")` делает строку, которую твой backend проверяет через `z.iso.date()`.

## 10. Что поменять в `HabitForm`

Сейчас:

```ts
addHabit(name);
setName("");
```

После API лучше дождаться результата:

```tsx
async function handleSubmit(e: SubmitEvent) {
  e.preventDefault();

  if (name.trim() === "") return;

  await addHabit(name);
  setName("");
}
```

Но есть нюанс: если запрос упадет, форма все равно очистится? В примере выше - нет, если ошибка проброшена наверх.

Лучше на учебном этапе сделать локальный submitting state:

```tsx
const [isSubmitting, setIsSubmitting] = useState(false);

async function handleSubmit(e: SubmitEvent) {
  e.preventDefault();

  if (name.trim() === "") return;

  try {
    setIsSubmitting(true);
    await addHabit(name);
    setName("");
  } finally {
    setIsSubmitting(false);
  }
}
```

И кнопку сделать disabled:

```tsx
<Button disabled={name.trim() === "" || isSubmitting}>
  Add Habit
</Button>
```

## 11. Что поменять в `HabitList`

Сейчас `HabitList` знает только про `habits`.

После API он должен учитывать loading/error:

```tsx
export function HabitList({ visibleDates }: HabitListProps) {
  const { habits, isLoading, error } = useHabits();

  if (isLoading) {
    return <p className="text-center text-zinc-500 py-12">Loading...</p>;
  }

  if (error != null) {
    return <p className="text-center text-red-400 py-12">{error}</p>;
  }

  if (habits.length === 0) {
    return (
      <p className="text-center text-zinc-500 py-12">
        No habits yet. Add one above to get started
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {habits.map((habit) => (
        <HabitItem key={habit.id} habit={habit} visibleDates={visibleDates} />
      ))}
    </div>
  );
}
```

На этом этапе этого достаточно.

## 12. Что делать с `Header`

`Header` сейчас считает:

```ts
const doneToday = habits.filter((h) =>
  h.completions.some((c) => isToday(c)),
).length;
```

Это можно оставить.

Но если habits еще грузятся, то `habits` просто `[]`. Header покажет `0 / 0 done today`. Для учебного этапа нормально.

Позже можно добавить:

```tsx
const { habits, isLoading } = useHabits();
```

И показывать что-то другое во время загрузки.

## 13. Что делать с `App`

В `App.tsx` у тебя есть учебный `useEffect` с `document.addEventListener("click", handler)`.

Он сейчас не нужен для этапа API. Он только будет шуметь в консоли.

Его можно убрать, когда будешь готов. Логика дат и `HabitProvider` остается.

## 14. Почему не надо писать fetch прямо в компонентах

Плохой вариант:

```tsx
function HabitForm() {
  async function handleSubmit() {
    await fetch("http://localhost:3000/api/habits", ...)
  }
}
```

Почему плохо:

- компонент формы начинает знать URL backend;
- обработка ошибок размазывается по компонентам;
- потом сложнее заменить REST на tRPC или TanStack Query;
- сложнее переиспользовать API calls.

Лучше:

```txt
HabitForm -> addHabit(name)
HabitProvider -> createHabit(name)
habitsApi.ts -> fetch(...)
```

Каждый слой знает только свою работу.

## 15. Что такое helper в этом контексте

Helper - это просто функция, которая убирает повторяющуюся техническую деталь.

Пример helper для проверки fetch:

```ts
async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error("Request failed");
  }

  return response.json();
}
```

Тогда можно писать:

```ts
export async function getHabits(): Promise<ApiHabit[]> {
  const response = await fetch(`${API_URL}/api/habits`);
  return parseJsonResponse<ApiHabit[]>(response);
}
```

Но на первом проходе я бы не делал слишком много helper-ов. Сначала напиши явно, потом увидишь дублирование.

## 16. Важный момент про ошибки

На backend у тебя есть разные ответы:

- `400` - неправильное тело или параметры;
- `404` - привычка не найдена;
- `409` - completion уже существует;
- `201` - создано;
- `204` - удалено.

На frontend сначала можно не делать сложный UI под каждый случай.

Минимально:

```ts
if (!response.ok) {
  throw new Error("Failed to ...");
}
```

Позже можно сделать общий формат ошибки на backend:

```json
{
  "error": "Invalid request body",
  "issues": []
}
```

И frontend будет показывать нормальное сообщение.

## 17. Важный момент про `Date`

Твой backend endpoint ожидает:

```txt
/api/habits/:id/toggle-completion/:date
```

Где `date` должна быть:

```txt
2026-06-21
```

Не отправляй:

```txt
date.toISOString()
```

Потому что получится:

```txt
2026-06-21T15:30:00.000Z
```

А твоя Zod-схема `z.iso.date()` ждет только дату без времени.

Используй:

```ts
format(date, "yyyy-MM-dd")
```

## 18. Как проверить руками

Сначала backend:

```txt
GET http://localhost:3000/health
GET http://localhost:3000/api/habits
POST http://localhost:3000/api/habits
POST http://localhost:3000/api/habits/:id/toggle-completion/2026-06-21
DELETE http://localhost:3000/api/habits/:id
```

Потом frontend:

1. Запусти API.
2. Запусти web.
3. Открой страницу.
4. Проверь, что видишь пустое состояние.
5. Создай привычку.
6. Проверь Network tab в браузере.
7. Нажми на день.
8. Проверь, что ушел POST на toggle endpoint.
9. Обнови страницу.
10. Убедись, что данные остались, пока API server не перезапущен.
11. Перезапусти API.
12. Обнови страницу.
13. Убедись, что данные пропали.

Если это работает - этап 2 выполнен.

## 19. Какой порядок действий я бы выбрал

1. Создать `apps/web/src/api/habitsApi.ts`.
2. Описать `ApiHabit` и функции `getHabits`, `createHabit`, `deleteHabitRequest`, `toggleHabitCompletion`.
3. В `useHabits.ts` добавить `isLoading`, `error`, async-функции.
4. В `HabitProvider.tsx` заменить `useLocalStorage` на `useState + useEffect + api calls`.
5. В `HabitForm.tsx` сделать `handleSubmit` async.
6. В `HabitList.tsx` добавить loading/error UI.
7. Проверить Network tab.
8. После этого удалить `useLocalStorage` только если он больше нигде не нужен.

## 20. Что должно щелкнуть в голове

Сейчас твой `HabitProvider` - это граница между UI и данными.

До API:

```txt
components -> context functions -> localStorage
```

После API:

```txt
components -> context functions -> api helpers -> fetch -> Express
```

Компоненты почти не меняются, потому что они уже используют context. Это как раз хороший пример, зачем context и custom hook были полезны.

## 21. Когда думать про TanStack Query

Не сейчас.

Подключай TanStack Query после того, как вручную напишешь:

- loading;
- error;
- first load;
- create;
- delete;
- toggle;
- refetch после обновления страницы.

Тогда TanStack Query станет понятным: он автоматизирует то, что ты уже сделал руками.

## 22. Что можно улучшить в backend, но не обязательно прямо сейчас

У тебя сейчас есть дублирование Zod-проверки:

```ts
const params = schema.safeParse(req.params);
if (!params.success) { ... }
```

Это нормально для обучения.

Позже можно сделать helper:

```ts
function validateParams(schema, params) {
  ...
}
```

Но не делай это сейчас, если оно мешает пониманию. Явный код лучше преждевременной абстракции.

Еще момент: toggle endpoint сейчас возвращает `201` и при добавлении, и при удалении. Для учебного проекта терпимо. Более аккуратно:

- при добавлении completion - `201`;
- при удалении completion - `200` с обновленной привычкой.

Но frontend на первом этапе может просто считать любой `2xx` успехом.

## 23. Минимальный результат этапа

Этап готов, если ты можешь объяснить:

- почему `useEffect` нужен для первой загрузки;
- почему `addHabit` стал async;
- почему backend отправляет date string, а frontend использует `Date`;
- почему `DELETE 204` нельзя парсить через `response.json()`;
- почему `fetch` лучше вынести из компонентов;
- почему context позволяет почти не менять `Header`, `HabitForm`, `HabitList`.

