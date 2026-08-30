/**
 * A. A+B
 *
 * https://github.com/Yandex-Practicum/algorithms-templates/blob/main/js/sprint0/a.js
 * https://contest.yandex.ru/contest/26365/problems/A/
 *
 * Формат ввода
 * В первой строке задано первое число, во второй – второе. Оба числа лежат
 * в диапазоне от -10^9 до 10^9.
 *
 * Формат вывода
 * Выведите единственное число – результат сложения двух чисел.
 */

const { run, readInt } = require('../../lib/io');

function solve() {
  const a = readInt();
  const b = readInt();

  const answer = a + b;

  console.log(answer);
}

run(solve);
