/**
 * C. Самый длинный палиндром 2
 *
 * https://contest.yandex.ru/contest/26131/problems/C/
 *
 * Палиндром - это строка, которая одинаково читается как слева направо, так
 * и справа налево.
 *
 * Из данной строки s путем удаления и перестановки букв надо получить палиндром
 * максимальной длины. Среди всех таких палиндромов надо получить
 * лексикографически минимальный. Количество удалений и перестановок символов
 * может быть любым.
 *
 * Формат ввода
 * В единственной строке дана строка s. Длина строки |s| ≤ 10^5. Строка состоит
 * из строчных букв английского алфавита.
 *
 * Формат вывода
 * Выведите полученный палиндром. Заметьте, что ответ определяется однозначно.
 */

const { run, readLine } = require('../../lib/io');

function solve() {
  const s = readLine();

  process.stdout.write(`${palindrome(s)}`);
}

/**
 * Составляет наибольший палиндром из символов строки.
 *
 * Символы можно переставлять, поэтому важны только их количества. Каждая пара
 * одинаковых символов уходит в палиндром симметрично: половина влево, половина
 * вправо. Символ с нечетным количеством может встать в середину, и он там
 * может быть только один.
 *
 * Среди символов с нечетным количеством в середину ставится наименьший:
 * из всех палиндромов максимальной длины требуется лексикографически
 * наименьший, а середина влияет на порядок слабее любой позиции слева.
 *
 * Время: O(|str| + |Σ|). Память: O(|Σ|).
 *
 * @param {string} str Строка из строчных латинских букв.
 * @returns {string} Наибольший палиндром, лексикографически наименьший
 *   среди таких.
 */
function palindrome(str) {
  const freq = new Array(26).fill(0);

  for (let i = 0; i < str.length; i++) {
    freq[str.charCodeAt(i) - 97]++;
  }

  let leftPart = '';
  let middlePart = '';
  let minOddChar = '';

  for (let i = 0; i < 26; i++) {
    const count = freq[i];
    const char = String.fromCharCode(i + 97);

    if (count % 2 === 1) {
      if (minOddChar === '' || char < minOddChar) {
        minOddChar = char;
      }
    }

    leftPart += repeat(char, Math.floor(count / 2));
  }

  if (minOddChar !== '') {
    middlePart = minOddChar;
  }

  return leftPart + middlePart + reverse(leftPart);
}

function repeat(char, count) {
  let result = '';

  for (let i = 0; i < count; i++) {
    result += char;
  }

  return result;
}

function reverse(str) {
  let reversed = '';

  for (let i = str.length - 1; i >= 0; i--) {
    reversed += str[i];
  }

  return reversed;
}

run(solve);
