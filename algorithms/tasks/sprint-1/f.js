/**
 * F. Палиндром
 *
 * https://github.com/Yandex-Practicum/algorithms-templates/blob/main/js/sprint1_nonfinals/f.js
 * https://contest.yandex.ru/contest/22449/problems/F/
 *
 * Помогите Васе понять, будет ли фраза палиндромом. Учитываются только буквы
 * и цифры, заглавные и строчные буквы считаются одинаковыми. Решение должно
 * работать за O(N), где N - длина строки на входе.
 *
 * Формат ввода
 * В единственной строке записана фраза или слово. Буквы могут быть только
 * латинские. Длина текста не превосходит 20000 символов. Фраза может состоять
 * из строчных и прописных латинских букв, цифр, знаков препинания.
 *
 * Формат вывода
 * Выведите «True», если фраза является палиндромом, и «False», если
 * не является.
 */

const { run, readLine } = require('../../lib/io');

const ALPHANUMERIC = /[a-z0-9]/i;

/**
 * Проверяет, является ли строка палиндромом.
 *
 * Учитываются только буквы и цифры, регистр не различается. Строка не
 * нормализуется заранее: два указателя идут навстречу друг другу и пропускают
 * незначащие символы на месте. За счет этого не создается ни очищенная, ни
 * развернутая копия строки.
 *
 * Время: O(n). Память: O(1).
 *
 * @param {string} line Проверяемая строка.
 * @returns {boolean} true, если строка является палиндромом.
 */
function isPalindrome(line) {
  let left = 0;
  let right = line.length - 1;

  while (left < right) {
    if (!ALPHANUMERIC.test(line[left])) {
      left++;
      continue;
    }

    if (!ALPHANUMERIC.test(line[right])) {
      right--;
      continue;
    }

    if (line[left].toLowerCase() !== line[right].toLowerCase()) {
      return false;
    }

    left++;
    right--;
  }

  return true;
}

function solve() {
  const line = readLine();
  if (isPalindrome(line)) {
    console.log('True');
  } else {
    console.log('False');
  }
}

run(solve);
