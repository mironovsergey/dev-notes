/**
 * E. Две фишки - 2
 *
 * https://github.com/Yandex-Practicum/algorithms-templates/blob/main/js/sprint0/e.js
 * https://contest.yandex.ru/contest/26365/problems/E/
 *
 * Рита и Гоша играют в игру. У Риты есть n фишек, на каждой из которых написано
 * количество очков. Фишки лежат на столе в порядке неубывания очков на них.
 * Сначала Гоша называет число k, затем Рита должна выбрать две фишки, сумма
 * очков на которых равна заданному числу. Рите надоело искать фишки самой, и
 * она решила применить свои навыки программирования для решения этой задачи.
 * Помогите ей написать программу для поиска нужных фишек.
 *
 * Формат ввода
 * В первой строке записано количество фишек n, 2 ≤ n ≤ 10^5. Во второй строке
 * записано n целых чисел в порядке неубывания - очки на фишках Риты в диапазоне
 * от -10^5 до 10^5. В третьей строке - загаданное Гошей целое число k,
 * -10^5 ≤ k ≤ 10^5.
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
  return twoSumWithSort(array, targetSum);
}

// Алгоритм с сортировкой и двумя указателями
function twoSumWithSort(array, targetSum) {
  array.sort((a, b) => a - b);

  let left = 0;
  let right = array.length - 1;

  while (left < right) {
    const currentSum = array[left] + array[right];

    if (currentSum === targetSum) {
      return [array[left], array[right]];
    } else if (currentSum < targetSum) {
      left++;
    } else {
      right--;
    }
  }

  return [];
}

// Алгоритм с хэш-множеством
// использует дополнительную память для хранения хэш-множества
function twoSumExtraDS(array, targetSum) {
  // Хэш-множество для хранения предыдущих значений
  const previous = new Set();

  for (const value of array) {
    // Комплементарное значение, которое нужно найти в
    // хэш-множестве для образования пары с текущим элементом
    const complement = targetSum - value;

    if (previous.has(complement)) {
      return [value, complement];
    } else {
      previous.add(value);
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
