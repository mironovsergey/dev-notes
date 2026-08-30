/**
 * L. Лишняя буква
 *
 * https://github.com/Yandex-Practicum/algorithms-templates/blob/main/js/sprint1_nonfinals/l.js
 * https://contest.yandex.ru/contest/22449/problems/L/
 *
 * Васе очень нравятся задачи про строки, поэтому он придумал свою. Есть 2
 * строки s и t, состоящие только из строчных букв. Строка t получена
 * перемешиванием букв строки s и добавлением 1 буквы в случайную позицию. Нужно
 * найти добавленную букву.
 *
 * Формат ввода
 * На вход подаются строки s и t, разделенные переносом строки. Длины строк не
 * превосходят 1000 символов. Строки не бывают пустыми.
 *
 * Формат вывода
 * Выведите лишнюю букву.
 */

const { run, readLine } = require('../../lib/io');

/**
 * Возвращает букву, добавленную во вторую строку.
 *
 * Вторая строка составлена из букв первой с добавлением ровно одного символа,
 * поэтому суммы кодов символов двух строк различаются в точности на код
 * добавленной буквы. Порядок символов на сумму не влияет, так что
 * перемешивание учитывать не требуется.
 *
 * Время: O(n). Память: O(1).
 *
 * @param {string} firstLine Исходная строка.
 * @param {string} secondLine Перемешанная строка с одной добавленной буквой.
 * @returns {string} Добавленная буква.
 */
function getExcessiveLetter(firstLine, secondLine) {
  let difference = 0;

  for (const char of secondLine) {
    difference += char.codePointAt(0);
  }

  for (const char of firstLine) {
    difference -= char.codePointAt(0);
  }

  return String.fromCodePoint(difference);
}

function solve() {
  const firstLine = readLine();
  const secondLine = readLine();
  process.stdout.write(`${getExcessiveLetter(firstLine, secondLine)}`);
}

run(solve);
