/**
 * A. Поиск в сломанном массиве
 *
 * https://contest.yandex.ru/contest/23815/problems/A/
 *
 * Алла ошиблась при копировании из одной структуры данных в другую. Она хранила
 * массив чисел в кольцевом буфере. Массив был отсортирован по возрастанию,
 * и в нем можно было найти элемент за логарифмическое время. Алла скопировала
 * данные из кольцевого буфера в обычный массив, но сдвинула данные исходной
 * отсортированной последовательности (при этом массив все равно мог остаться
 * отсортированным).
 *
 * Тем не менее, нужно обеспечить возможность находить в нем элемент за O(log n)
 *
 * Можно предполагать, что в массиве только уникальные элементы.
 *
 * От вас требуется реализовать функцию, осуществляющую поиск в сломанном
 * массиве.
 *
 * Формат ввода
 * Функция принимает массив натуральных чисел и искомое число k. Длина массива
 * не превосходит 10000. Элементы массива и число k не превосходят по значению
 * 10000.
 * В примерах:
 * В первой строке записано число n - длина массива.
 * Во второй строке записано положительное число k - искомый элемент.
 * Далее в строку через пробел записано n натуральных чисел – элементы массива.
 *
 * Формат вывода
 * Функция должна вернуть индекс элемента, равного k, если такой есть в массиве
 * (нумерация с нуля). Если элемент не найден, функция должна вернуть -1.
 * Изменять массив нельзя.
 *
 * Отчет: https://contest.yandex.ru/contest/23815/run-report/108207106/
 */

/**
 * Ищет число в отсортированном массиве, циклически сдвинутом на неизвестную
 * величину.
 *
 * Ключевое наблюдение: после деления пополам хотя бы одна из половин заведомо
 * отсортирована без разрыва. Определить какая можно одним сравнением концов:
 * если arr[left] <= arr[mid], разрыва в левой половине нет, иначе он в ней.
 * Для отсортированной половины проверка «лежит ли k внутри ее границ»
 * выполняется за O(1), и поиск продолжается в одной из двух половин - ровно
 * как в обычном бинарном поиске.
 *
 * Элементы массива уникальны, поэтому неоднозначности при arr[left] === arr[mid]
 * не возникает.
 *
 * Время: O(log n). Память: O(log n) на кадры стека вызовов.
 *
 * @param {number[]} arr Отсортированный по возрастанию массив, циклически
 *   сдвинутый; не изменяется.
 * @param {number} k Искомое число.
 * @param {number} left Левая граница диапазона поиска, включительно.
 * @param {number} right Правая граница диапазона поиска, включительно.
 * @returns {number} Индекс элемента, равного k, либо -1, если его нет.
 */
function brokenSearch(arr, k, left = 0, right = arr.length - 1) {
  if (right < left) {
    return -1;
  }

  const mid = Math.floor((left + right) / 2);

  if (arr[mid] === k) {
    return mid;
  }

  if (arr[left] <= arr[mid]) {
    if (k < arr[mid] && k >= arr[left]) {
      return brokenSearch(arr, k, left, mid - 1);
    } else {
      return brokenSearch(arr, k, mid + 1, right);
    }
  } else {
    if (k > arr[mid] && k <= arr[right]) {
      return brokenSearch(arr, k, mid + 1, right);
    } else {
      return brokenSearch(arr, k, left, mid - 1);
    }
  }
}

// Локальная проверка: проверяющая система вызывает только brokenSearch.
if (process.env.REMOTE_JUDGE !== 'true') {
  const assert = require('assert');

  const arr = [19, 21, 100, 101, 1, 4, 5, 7, 12];

  assert.strictEqual(brokenSearch(arr, 5), 6);
  assert.strictEqual(brokenSearch(arr, 19), 0);
  assert.strictEqual(brokenSearch(arr, 12), 8);
  assert.strictEqual(brokenSearch(arr, 101), 3);
  assert.strictEqual(brokenSearch(arr, 1), 4);
  assert.strictEqual(brokenSearch(arr, 50), -1);

  // Несдвинутый массив - частный случай сдвига на ноль
  assert.strictEqual(brokenSearch([1, 2, 3, 4, 5], 4), 3);
  assert.strictEqual(brokenSearch([1, 2, 3, 4, 5], 6), -1);

  // Вырожденные размеры
  assert.strictEqual(brokenSearch([42], 42), 0);
  assert.strictEqual(brokenSearch([42], 1), -1);
  assert.strictEqual(brokenSearch([], 1), -1);

  // Сдвиг на каждую возможную величину при всех возможных искомых значениях
  const base = [1, 3, 5, 7, 9, 11, 13];

  for (let shift = 0; shift < base.length; shift++) {
    const rotated = base.slice(shift).concat(base.slice(0, shift));

    for (let value = 0; value <= 14; value++) {
      assert.strictEqual(
        brokenSearch(rotated, value),
        rotated.indexOf(value),
        `сдвиг ${shift}, значение ${value}`,
      );
    }
  }

  console.log('a.js: OK');
}
