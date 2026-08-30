/**
 * D. Заботливая мама
 *
 * https://github.com/Yandex-Practicum/algorithms-templates/blob/main/js/sprint2/D/code.js
 * https://contest.yandex.ru/contest/22779/problems/D/
 *
 * Мама Васи хочет знать, что сын планирует делать и когда. Помогите ей:
 * напишите функцию solution, определяющую индекс первого вхождения
 * передаваемого ей на вход значения в связном списке, если значение
 * присутствует.
 *
 * Формат ввода
 * Функция на вход принимает голову односвязного списка и элемент, который нужно
 * найти. Длина списка не превосходит 10000 элементов. Список не бывает пустым.
 *
 * Формат вывода
 * Функция возвращает индекс первого вхождения искомого элемента в список
 * (индексация начинается с нуля). Если элемент не найден, нужно вернуть -1.
 */

/**
 * Возвращает индекс первого вхождения значения в односвязный список.
 *
 * Время: O(n). Память: O(1).
 *
 * @param {Node|null} node Голова списка.
 * @param {*} elem Искомое значение.
 * @returns {number} Индекс первого вхождения либо -1, если значение отсутствует.
 */
function solution(node, elem) {
  let idx = 0;

  while (node !== null) {
    if (node.value === elem) {
      return idx;
    }

    node = node.next;
    idx++;
  }

  return -1;
}

// Локальная проверка. Проверяющая система объявляет класс Node самостоятельно,
// поэтому и объявление, и тесты выполняются только при локальном запуске.
// Объявление внутри блока видно лишь внутри него - это ровно то, что нужно.
if (process.env.REMOTE_JUDGE !== 'true') {
  const assert = require('assert');

  class Node {
    constructor(value = null, next = null) {
      this.value = value;
      this.next = next;
    }
  }

  const list = new Node(
    'node0',
    new Node('node1', new Node('node2', new Node('node3'))),
  );

  assert.strictEqual(solution(list, 'node2'), 2);
  assert.strictEqual(solution(list, 'node0'), 0);
  assert.strictEqual(solution(list, 'node3'), 3);
  assert.strictEqual(solution(list, 'missing'), -1);

  console.log('d.js: OK');
}
