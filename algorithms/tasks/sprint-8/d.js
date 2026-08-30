/**
 * D. Общий префикс
 *
 * https://contest.yandex.ru/contest/26131/problems/D/
 *
 * Найдите наибольший по длине общий префикс нескольких строк.
 *
 * Формат ввода
 * В первой строке дано число n (1 ≤ n ≤ 10^5). Затем по одной на строке даны
 * n строк, каждая не превышает 10^5 в длину. Суммарная длина всех строк
 * не превосходит 10^7.
 *
 * Формат вывода
 * Выведите единственное число - длину наибольшего префикса всех данных строк.
 */

const { run, readInt, readLine } = require('../../lib/io');

function solve() {
  const n = readInt(); // Число строк
  const lines = []; // Массив строк

  for (let i = 1; i <= n; i++) {
    lines.push(readLine());
  }

  process.stdout.write(`${longestCommonPrefix(lines)}`);
}

/**
 * Возвращает длину наибольшего общего префикса набора строк.
 *
 * Символы первой строки сравниваются со всеми остальными по столбцам: как
 * только хотя бы одна строка расходится или заканчивается, общий префикс
 * закончился. Обращение за пределы короткой строки дает undefined, что не
 * совпадает ни с одним символом, поэтому отдельная проверка длины не нужна.
 *
 * Время: O(n · L), где L - длина ответа. Память: O(1).
 *
 * @param {string[]} lines Набор строк.
 * @returns {number} Длина наибольшего общего префикса.
 */
function longestCommonPrefix(lines) {
  const str = lines[0];
  let prefixLength = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    for (let j = 1; j < lines.length; j++) {
      if (lines[j][i] !== char) {
        return prefixLength;
      }
    }

    prefixLength++;
  }

  return prefixLength;
}

run(solve);
