/**
 * I. Степень четырех
 *
 * https://github.com/Yandex-Practicum/algorithms-templates/blob/main/js/sprint1_nonfinals/i.js
 * https://contest.yandex.ru/contest/22449/problems/I/
 *
 * Напишите программу, которая определяет, будет ли положительное целое число
 * степенью четверки.
 *
 * Подсказка: степенью четверки будут все числа вида 4^n, где n – целое
 * неотрицательное число.
 *
 * Формат ввода
 * На вход подается целое число в диапазоне от 1 до 10000.
 *
 * Формат вывода
 * Выведите «True», если число является степенью четырех, «False» – в обратном
 * случае.
 */

const { run, readInt } = require('../../lib/io');

/**
 * Проверяет, является ли положительное целое число степенью четырех.
 *
 * Число делится на 4 до тех пор, пока делится нацело. Если в результате
 * получена единица, исходное число имело вид 4^n.
 *
 * Время: O(log n). Память: O(1).
 *
 * @param {number} number Положительное целое число.
 * @returns {boolean} true, если число является степенью четырех.
 */
function isPowerOfFour(number) {
  while (number > 1) {
    if (number % 4 !== 0) {
      return false;
    }

    number /= 4;
  }

  return true;
}

function solve() {
  const number = readInt();
  if (isPowerOfFour(number)) {
    console.log('True');
  } else {
    console.log('False');
  }
}

run(solve);
