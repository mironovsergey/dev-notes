/**
 * F. Частое слово
 *
 * https://contest.yandex.ru/contest/26131/problems/F/
 *
 * Дан набор слов, слова могут повторяться. Среди них надо найти самое частое
 * слово. Если таких слов несколько, то выведите лексикографически наименьшее.
 *
 * Формат ввода
 * В первой строке дано число n (1 ≤ n ≤ 10^3) - количество строк. В следующих
 * n строках даны слова, состоящие из строчных букв английского алфавита. Слово
 * не бывает пустым.
 *
 * Суммарная длина слов не превосходит 10^7.
 * Длина одного слова не превосходит 10^5.
 *
 * Формат вывода
 * Выведите единственную строку – наиболее частое слово, лексикографически
 * минимальное, если самых частых слов несколько.
 */

const { run, readInt, readLine } = require('../../lib/io');

function solve() {
  const n = readInt(); // Число строк
  const lines = []; // Массив строк

  for (let i = 1; i <= n; i++) {
    lines.push(readLine());
  }

  process.stdout.write(`${findMostFrequentWord(lines)}`);
}

/**
 * Возвращает наиболее часто встречающееся слово.
 *
 * Частоты считаются хеш-таблицей за один проход. При равной частоте
 * выбирается слово, встретившееся раньше: сравнение строгое, поэтому
 * первое найденное значение максимума не заменяется.
 *
 * Время: O(суммарной длины слов). Память: O(суммарной длины слов).
 *
 * @param {string[]} words Слова.
 * @returns {string} Самое частое слово.
 */
function findMostFrequentWord(words) {
  const map = new Map();

  // Подсчитываем частоту каждого слова
  for (const word of words) {
    if (map.has(word)) {
      map.set(word, map.get(word) + 1);
    } else {
      map.set(word, 1);
    }
  }

  let mostFrequentWord = '';
  let maxFrequency = 0;

  // Поиск слова с максимальной частотой
  for (const [word, frequency] of map.entries()) {
    if (frequency > maxFrequency) {
      mostFrequentWord = word;
      maxFrequency = frequency;
    } else if (frequency === maxFrequency) {
      if (word < mostFrequentWord) {
        mostFrequentWord = word;
      }
    }
  }

  return mostFrequentWord;
}

run(solve);
