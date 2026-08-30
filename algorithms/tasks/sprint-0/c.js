/**
 * C. Скользящее среднее
 *
 * https://github.com/Yandex-Practicum/algorithms-templates/blob/main/js/sprint0/c.js
 * https://contest.yandex.ru/contest/26365/problems/C/
 *
 * Вам дана статистика по числу запросов в секунду к вашему любимому
 * рекомендательному сервису. Измерения велись n секунд. В секунду i поступает
 * qi запросов. Примените метод скользящего среднего с длиной окна k к этим
 * данным и выведите результат.
 *
 * Формат ввода
 * В первой строке передается натуральное число n, количество секунд, в течение
 * которых велись измерения. 1 ≤ n ≤ 10^5. Во второй строке через пробел
 * записаны n целых неотрицательных чисел qi, каждое лежит в диапазоне от 0
 * до 10^3. В третьей строке записано натуральное число k (1 ≤ k ≤ n) - окно
 * сглаживания.
 *
 * Формат вывода
 * Выведите через пробел результат применения метода скользящего среднего
 * к серии измерений. Должно быть выведено n - k + 1 элементов, каждый
 * элемент - вещественное (дробное) число.
 */

const { run, readInt, readArray } = require('../../lib/io');

// Оптимизированный алгоритм
function movingAverage(array, windowSize) {
  if (windowSize <= 0 || windowSize > array.length) {
    throw new Error(
      'Значение окна сглаживания не должно быть меньше длины массива',
    );
  }

  const result = [];
  let currentSum = array
    .slice(0, windowSize)
    .reduce((sum, value) => sum + value, 0);

  result.push(currentSum / windowSize);

  for (let i = 0; i < array.length - windowSize; i++) {
    currentSum -= array[i];
    currentSum += array[i + windowSize];

    const currentAvg = currentSum / windowSize;

    result.push(currentAvg);
  }

  return result;
}

// Наивный алгоритм
function naiveMovingAverage(array, windowSize) {
  if (windowSize <= 0 || windowSize > array.length) {
    throw new Error(
      'Значение окна сглаживания не должно быть меньше длины массива',
    );
  }

  const result = [];

  for (
    let beginIndex = 0;
    beginIndex <= array.length - windowSize;
    beginIndex++
  ) {
    const endIndex = beginIndex + windowSize;
    let currentSum = 0;

    for (let i = beginIndex; i < endIndex; i++) {
      currentSum += array[i];
    }

    const currentAvg = currentSum / windowSize;

    result.push(currentAvg);
  }

  return result;
}

function solve() {
  const n = readInt();
  const arr = readArray();
  const windowSize = readInt();
  process.stdout.write(`${movingAverage(arr, windowSize).join(' ')}`);
}

run(solve);
