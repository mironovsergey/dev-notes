/**
 * H. Двоичная система
 *
 * https://github.com/Yandex-Practicum/algorithms-templates/blob/main/js/sprint1_nonfinals/h.js
 * https://contest.yandex.ru/contest/22449/problems/H/
 *
 * Тимофей записал два числа в двоичной системе счисления и попросил Гошу
 * вывести их сумму, также в двоичной системе. Встроенную в язык
 * программирования возможность сложения двоичных чисел применять нельзя.
 * Помогите Гоше решить задачу. Решение должно работать за O(N), где N –
 * количество разрядов максимального числа на входе.
 *
 * Формат ввода
 * Два числа в двоичной системе счисления, каждое на отдельной строке. Длина
 * каждого числа не превосходит 10 000 символов.
 *
 * Формат вывода
 * Одно число в двоичной системе счисления.
 */

const { run, readLine } = require('../../lib/io');

/**
 * Складывает два числа, записанных в двоичной системе счисления.
 *
 * Сложение выполняется в столбик от младшего разряда к старшему. Разряды
 * накапливаются в массиве, а не приписываются к строке: строки в JavaScript
 * неизменяемы, поэтому конкатенация в цикле создавала бы новую строку на
 * каждой итерации.
 *
 * Время: O(n), где n - количество разрядов большего числа. Память: O(n).
 *
 * @param {string} firstNumber Первое слагаемое в двоичной записи.
 * @param {string} secondNumber Второе слагаемое в двоичной записи.
 * @returns {string} Сумма в двоичной записи.
 */
function sumOfBinaries(firstNumber, secondNumber) {
  const length = Math.max(firstNumber.length, secondNumber.length);
  const first = firstNumber.padStart(length, '0');
  const second = secondNumber.padStart(length, '0');

  const digits = [];
  let carry = 0;

  for (let i = length - 1; i >= 0; i--) {
    const sum = Number(first[i]) + Number(second[i]) + carry;

    digits.push(sum % 2);
    carry = Math.floor(sum / 2);
  }

  if (carry > 0) {
    digits.push(carry);
  }

  return digits.reverse().join('');
}

function solve() {
  const firstNumber = readLine();
  const secondNumber = readLine();
  process.stdout.write(`${sumOfBinaries(firstNumber, secondNumber)}`);
}

run(solve);
