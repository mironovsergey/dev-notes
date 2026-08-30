/**
 * B. Четные и нечетные числа
 *
 * https://github.com/Yandex-Practicum/algorithms-templates/blob/main/js/sprint1_nonfinals/b.js
 * https://contest.yandex.ru/contest/22449/problems/B/
 *
 * Представьте себе онлайн-игру для поездки в метро: игрок нажимает на кнопку,
 * и на экране появляются три случайных числа. Если все три числа оказываются
 * одной четности, игрок выигрывает.
 *
 * Напишите программу, которая по трем числам определяет, выиграл игрок или нет.
 *
 * Формат ввода
 * В первой строке записаны три случайных целых числа a, b и c. Числа не
 * превосходят 109 по модулю.
 *
 * Формат вывода
 * Выведите «WIN», если игрок выиграл, и «FAIL» в противном случае.
 */

const { run, readArray } = require('../../lib/io');

/**
 * Проверяет, что три числа имеют одинаковую четность.
 *
 * Взятие модуля обязательно: для отрицательных чисел операция % в JavaScript
 * возвращает отрицательный остаток, и сравнение остатков дало бы неверный
 * результат для пары чисел разного знака.
 *
 * Время: O(1). Память: O(1).
 *
 * @param {number} a Первое число.
 * @param {number} b Второе число.
 * @param {number} c Третье число.
 * @returns {boolean} true, если все три числа одной четности.
 */
function checkParity(a, b, c) {
  const parityA = Math.abs(a) % 2;
  const parityB = Math.abs(b) % 2;
  const parityC = Math.abs(c) % 2;

  return parityA === parityB && parityB === parityC;
}

function solve() {
  const inputNumbers = readArray();
  const a = inputNumbers[0];
  const b = inputNumbers[1];
  const c = inputNumbers[2];
  if (checkParity(a, b, c)) {
    process.stdout.write('WIN');
  } else {
    process.stdout.write('FAIL');
  }
}

run(solve);
