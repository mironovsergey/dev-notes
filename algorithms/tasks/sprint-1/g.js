/**
 * G. Работа из дома
 *
 * https://github.com/Yandex-Practicum/algorithms-templates/blob/main/js/sprint1_nonfinals/g.js
 * https://contest.yandex.ru/contest/22449/problems/G/
 *
 * Вася реализовал функцию, которая переводит целое число из десятичной системы
 * в двоичную. Но, кажется, она получилась не очень оптимальной. Попробуйте
 * написать более эффективную программу.
 *
 * Не используйте встроенные средства языка по переводу чисел в бинарное
 * представление.
 *
 * Формат ввода
 * На вход подается целое число в диапазоне от 0 до 10000.
 *
 * Формат вывода
 * Выведите двоичное представление этого числа.
 */

const { run, readInt } = require('../../lib/io');

/**
 * Возвращает двоичную запись неотрицательного целого числа.
 *
 * Разряды получаются последовательным делением на 2 с сохранением остатков,
 * которые считываются от младшего к старшему.
 *
 * Время: O(log n). Память: O(log n).
 *
 * @param {number} number Неотрицательное целое число.
 * @returns {string} Двоичное представление числа.
 */
function getBinaryNumber(number) {
  if (number === 0) {
    return '0';
  }

  let binaryNumber = '';

  while (number >= 1) {
    binaryNumber = (number % 2) + binaryNumber;
    number = Math.floor(number / 2);
  }

  return binaryNumber;
}

function solve() {
  const n = readInt();
  process.stdout.write(`${getBinaryNumber(n)}`);
}

run(solve);
