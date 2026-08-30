/**
 * B. Расписание
 *
 * https://contest.yandex.ru/contest/25596/problems/B/
 *
 * Дано количество учебных занятий, проходящих в одной аудитории. Для каждого из
 * них указано время начала и конца. Нужно составить расписание, в соответствии
 * с которым в классе можно будет провести как можно больше занятий.
 *
 * Если возможно несколько оптимальных вариантов, то выведите любой. Возможно
 * одновременное проведение более чем одного занятия нулевой длительности.
 *
 * Формат ввода
 * В первой строке задано число занятий. Оно не превосходит 1000. Далее для
 * каждого занятия в отдельной строке записано время начала и конца, разделенные
 * пробелом. Время задается одним целым числом h, если урок
 * начинается/заканчивается ровно в h часов. Если же урок
 * начинается/заканчивается в h часов m минут, то время записывается как h.m.
 * Гарантируется, что каждое занятие начинается не позже, чем заканчивается.
 * Указываются только значащие цифры.
 *
 * Формат вывода
 * Выведите в первой строке наибольшее число уроков, которое можно провести
 * в аудитории. Далее выведите время начала и конца каждого урока в отдельной
 * строке в порядке их проведения.
 */

const { run, readInt, readLine } = require('../../lib/io');

function solve() {
  const n = readInt(); // Число занятий
  const lessons = []; // Время начала и конца каждого урока

  for (let i = 1; i <= n; i++) {
    lessons.push(readLine().split(' '));
  }

  const selectedLessons = getMaxLessons(lessons);

  process.stdout.write(`${selectedLessons.length}\n`);

  selectedLessons.forEach((selectedLesson) => {
    process.stdout.write(`${selectedLesson.join(' ')}\n`);
  });
}

/**
 * Возвращает наибольший набор непересекающихся занятий.
 *
 * Жадная стратегия: занятия перебираются по возрастанию времени окончания,
 * и берется каждое, начинающееся не раньше конца последнего взятого. Выбор
 * корректен по обменному аргументу: занятие, освобождающее аудиторию раньше
 * всех, можно подставить вместо первого занятия любого оптимального набора,
 * не уменьшив его размер.
 *
 * Сортировка по времени начала или по длительности дает неверный ответ.
 *
 * Время: O(n·log n) на сортировку. Память: O(n).
 *
 * @param {string[][]} lessons Занятия в виде пар [начало, конец] в формате «ч.мм».
 * @returns {string[][]} Выбранные занятия в исходном формате.
 */
function getMaxLessons(lessons) {
  const toMinutes = (time) => {
    const [h, m] = time.split('.').map(Number);
    return h * 60 + (m || 0);
  };

  const fromMinutes = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h}` : `${h}.${m}`;
  };

  const lessonsInMinutes = lessons.map(([start, end]) => [
    toMinutes(start),
    toMinutes(end),
  ]);

  lessonsInMinutes.sort((a, b) => a[1] - b[1] || a[0] - b[0]);

  const selectedLessons = [];
  let lastEndTime = -1;

  for (const [start, end] of lessonsInMinutes) {
    if (start >= lastEndTime) {
      selectedLessons.push([fromMinutes(start), fromMinutes(end)]);
      lastEndTime = end;
    }
  }

  return selectedLessons;
}

run(solve);
