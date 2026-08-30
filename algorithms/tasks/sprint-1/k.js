/**
 * K. Списочная форма
 *
 * https://github.com/Yandex-Practicum/algorithms-templates/blob/main/js/sprint1_nonfinals/k.js
 * https://contest.yandex.ru/contest/22449/problems/K/
 *
 * Вася просил Аллу помочь решить задачу. На этот раз по информатике. Для
 * неотрицательного целого числа X списочная форма – это массив его цифр слева
 * направо. К примеру, для 1231 списочная форма будет [1,2,3,1]. На вход
 * подается количество цифр числа Х, списочная форма неотрицательного числа Х и
 * неотрицательное число K. Число К не превосходят 10000. Длина числа Х не
 * превосходит 1000.
 *
 * Нужно вернуть списочную форму числа X + K.
 *
 * Не используйте встроенные средства языка для сложения длинных чисел.
 *
 * Формат ввода
 * В первой строке - длина списочной формы числа X. На следующей строке - сама
 * списочная форма с цифрами записанными через пробел. В последней строке
 * записано число K, 0 ≤ K ≤ 10000.
 *
 * Формат вывода
 * Выведите списочную форму числа X+K.
 */

const { run, readInt, readArray } = require('../../lib/io');

/**
 * Складывает число, заданное списочной формой, с целым числом
 * и возвращает результат в списочной форме.
 *
 * Сложение выполняется в столбик от младшего разряда к старшему, поэтому оба
 * слагаемых предварительно разворачиваются.
 *
 * Время: O(n), где n - количество цифр большего слагаемого. Память: O(n).
 *
 * @param {number[]} listNumber Списочная форма числа X: цифры слева направо.
 * @param {number} number Слагаемое K.
 * @returns {number[]} Списочная форма суммы X + K.
 */
function getSum(listNumber, number) {
  const xListForm = listNumber.slice().reverse();
  const kListForm = number.toString().split('').map(Number).reverse();
  const len = Math.max(xListForm.length, kListForm.length);

  const result = [];
  let carry = 0;

  for (let i = 0; i < len; i++) {
    const sum = (xListForm[i] || 0) + (kListForm[i] || 0) + carry;
    result.push(sum % 10);
    carry = Math.floor(sum / 10);
  }

  if (carry > 0) {
    result.push(carry);
  }

  return result.reverse();
}

function solve() {
  const length = readInt();
  const listNumber = readArray();
  const number = readInt();

  process.stdout.write(`${getSum(listNumber, number).join(' ')}`);
}

run(solve);
