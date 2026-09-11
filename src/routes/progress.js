import { Router } from 'express';
import { db } from '../db/index.js';
import { course, publicCourse } from '../data/course.js';

export const progressRouter = Router();

progressRouter.get('/course', (req, res) => {
  const { unlockedModules } = getUnlockedState(req.telegramUser.id);
  const payload = publicCourse().map((m, i) => ({
    ...m,
    locked: i >= unlockedModules,
  }));
  res.json({ course: payload });
});

progressRouter.get('/progress', (req, res) => {
  const completions = db.prepare(`
    SELECT module_index, lesson_index, quiz_correct, completed_at
    FROM lesson_completions WHERE telegram_id = ?
  `).all(req.telegramUser.id);

  const user = db.prepare(`SELECT streak_count FROM users WHERE telegram_id = ?`).get(req.telegramUser.id);
  const { unlockedModules } = getUnlockedState(req.telegramUser.id);

  res.json({
    completions,
    streak: user?.streak_count ?? 0,
    unlockedModules,
  });
});

progressRouter.post('/progress/complete', (req, res) => {
  const { moduleIndex, lessonIndex, selectedOption } = req.body || {};
  const moduleData = course[moduleIndex];
  const lessonData = moduleData?.lessons[lessonIndex];

  if (!moduleData || !lessonData) {
    return res.status(400).json({ error: 'invalid_lesson' });
  }

  const { unlockedModules } = getUnlockedState(req.telegramUser.id);
  if (moduleIndex >= unlockedModules) {
    return res.status(403).json({ error: 'module_locked' });
  }

  const isCorrect = selectedOption === lessonData.quiz.correct;

  db.prepare(`
    INSERT INTO lesson_completions (telegram_id, module_index, lesson_index, quiz_correct)
    VALUES (@telegram_id, @moduleIndex, @lessonIndex, @quizCorrect)
    ON CONFLICT(telegram_id, module_index, lesson_index) DO UPDATE SET
      quiz_correct = excluded.quiz_correct,
      completed_at = datetime('now')
  `).run({
    telegram_id: req.telegramUser.id,
    moduleIndex,
    lessonIndex,
    quizCorrect: isCorrect ? 1 : 0,
  });

  updateStreak(req.telegramUser.id);

  const { unlockedModules: newUnlocked } = getUnlockedState(req.telegramUser.id);

  res.json({
    isCorrect,
    unlockedModules: newUnlocked,
    moduleJustCompleted: newUnlocked > unlockedModules,
  });
});

function getUnlockedState(telegramId) {
  let unlockedModules = 1;
  for (let i = 0; i < course.length - 1; i++) {
    const total = course[i].lessons.length;
    if (total === 0) break;
    const done = db.prepare(`
      SELECT COUNT(*) AS n FROM lesson_completions
      WHERE telegram_id = ? AND module_index = ?
    `).get(telegramId, i).n;
    if (done >= total) unlockedModules = i + 2;
    else break;
  }
  return { unlockedModules };
}

function updateStreak(telegramId) {
  const row = db.prepare(`SELECT streak_count, streak_date FROM users WHERE telegram_id = ?`).get(telegramId);
  const today = new Date().toISOString().slice(0, 10);
  if (!row) return;

  if (row.streak_date === today) return;

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const newStreak = row.streak_date === yesterday ? row.streak_count + 1 : 1;

  db.prepare(`UPDATE users SET streak_count = ?, streak_date = ? WHERE telegram_id = ?`)
    .run(newStreak, today, telegramId);
}
