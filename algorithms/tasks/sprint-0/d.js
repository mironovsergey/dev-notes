/**
 * D. Две фишки
 *
 * https://github.com/Yandex-Practicum/algorithms-templates/blob/main/js/sprint0/d.js
 * https://contest.yandex.ru/contest/26365/problems/D/
 *
 * Рита и Гоша играют в игру. У Риты есть n фишек, на каждой из которых написано
 * количество очков. Сначала Гоша называет число k, затем Рита должна выбрать
 * две фишки, сумма очков на которых равна заданному числу. Рите надоело искать
 * фишки самой, и она решила применить свои навыки программирования для решения
 * этой задачи. Помогите ей написать программу для поиска нужных фишек.
 *
 * Формат ввода
 * В первой строке записано количество фишек n, 2 ≤ n ≤ 10^4. Во второй строке
 * записано n целых чисел - очки на фишках Риты в диапазоне от -10^5 до 10^5.
 * В третьей строке - загаданное Гошей целое число k, -10^5 ≤ k ≤ 10^5.
 *
 * Формат вывода
 * Нужно вывести два числа - очки на двух фишках, в сумме дающие k. Если таких
 * пар несколько, то можно вывести любую из них. Если таких пар не существует,
 * то вывести «None».
 */

const { run, readInt, readArray } = require('../../lib/io');

// Если ответ существует, верните список из двух элементов
// Если нет - то верните пустой список
function twoSum(array, targetSum) {
  for (let i = 0; i < array.length; i++) {
    for (let j = i + 1; j < array.length; j++) {
      if (array[i] + array[j] === targetSum) {
        return [array[i], array[j]];
      }
    }
  }

  return [];
}

function solve() {
  const n = readInt();
  const array = readArray();
  const targetSum = readInt();
  const ans = twoSum(array, targetSum);

  if (ans.length === 0) {
    console.log('None');
  } else {
    process.stdout.write(`${ans.join(' ')}`);
  }
}

run(solve);
