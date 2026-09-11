// Source of truth for course structure. Quiz `correct` indices stay on the
// server — the /api/course endpoint strips them before sending to the client.
export const course = [
  {
    title: 'Основы',
    sub: 'Рынок, ордера, риск-менеджмент, психология',
    lessons: [
      { name: 'Ордера и риск-менеджмент', quiz: { correct: 1 } },
      { name: 'Психология входа в сделку', quiz: { correct: 1 } },
      { name: 'Типы брокеров и спреды', quiz: { correct: 1 } },
      { name: 'Торговые сессии', quiz: { correct: 1 } },
      { name: 'Итоговый разбор', quiz: { correct: 1 } },
    ],
  },
  { title: 'Технический анализ', sub: 'Свечи, уровни, тренды, Fibonacci', lessons: [] },
  { title: 'Инструменты: золото и крипта', sub: 'XAU/USD и BTC/USD — что их двигает', lessons: [] },
  { title: 'Smart Money Concepts', sub: 'BOS/CHoCH, FVG, ликвидность, order blocks', lessons: [] },
  { title: 'Практика', sub: 'Торговый план, журнал сделок, разбор кейсов', lessons: [] },
];

export function publicCourse() {
  return course.map(m => ({
    title: m.title,
    sub: m.sub,
    lessons: m.lessons.map(l => ({ name: l.name })),
  }));
}
