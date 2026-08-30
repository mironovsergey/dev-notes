/**
 * A. Разворот строки
 *
 * https://contest.yandex.ru/contest/26131/problems/A/
 *
 * В некоторых языках предложения пишутся и читаются не слева направо, а справа
 * налево.
 *
 * Вам под руку попался странный текст - в нем обычный (слева направо) порядок
 * букв в словах. А вот сами слова идут в противоположном направлении. Вам надо
 * преобразовать текст так, чтобы слова в нем были написаны слева направо.
 *
 * Формат ввода
 * На ввод подается строка, состоящая из слов, разделенных пробелами (один
 * пробел между соседними словами). Всего слов не более 1000, длина каждого
 * из них - от 1 до 100 символов. Слова состоят из строчных букв английского
 * алфавита.
 *
 * Формат вывода
 * Выведите строку с обратным порядком слов в ней.
 */

const { run, readLine } = require('../../lib/io');

function solve() {
  const s = readLine();

  process.stdout.write(`${reverseWords(s)}`);
}

/**
 * Возвращает слова строки в обратном порядке.
 *
 * Слова накапливаются в массив и склеиваются один раз: приписывание к строке
 * в цикле создавало бы новую строку на каждом символе.
 *
 * Время: O(|s|). Память: O(|s|).
 *
 * @param {string} s Строка из слов, разделенных пробелами.
 * @returns {string} Слова в обратном порядке через один пробел.
 */
function reverseWords(s) {
  let words = [];
  let currentWord = '';

  for (let i = 0; i < s.length; i++) {
    if (s[i] === ' ') {
      if (currentWord.length > 0) {
        words.push(currentWord);
        currentWord = '';
      }
    } else {
      currentWord += s[i];
    }
  }

  if (currentWord.length > 0) {
    words.push(currentWord);
  }

  let reversedWords = [];

  for (let i = words.length - 1; i >= 0; i--) {
    reversedWords.push(words[i]);
  }

  let result = '';

  for (let i = 0; i < reversedWords.length; i++) {
    if (i > 0) {
      result += ' ';
    }
    result += reversedWords[i];
  }

  return result;
}

run(solve);
