/**
 * B. Список дел
 *
 * https://github.com/Yandex-Practicum/algorithms-templates/blob/main/js/sprint2/B/code.js
 * https://contest.yandex.ru/contest/22779/problems/B/
 *
 * Васе нужно распечатать свой список дел на сегодня. Помогите ему: напишите
 * функцию, которая печатает все его дела. Известно, что дел у Васи не больше
 * 5000.
 *
 * Формат ввода
 * В качестве ответа сдайте только код функции, которая печатает элементы
 * списка. Длина списка не превосходит 5000 элементов. Список не бывает пустым.
 *
 * Формат вывода
 * Функция должна напечатать элементы списка по одному в строке.
 */

/**
 * Печатает значения всех узлов односвязного списка, по одному в строке.
 *
 * Время: O(n). Память: O(1).
 *
 * @param {Node|null} head Голова списка.
 * @returns {void}
 */
function solution(head) {
  let node = head;

  while (node !== null) {
    process.stdout.write(`${node.value}\n`);
    node = node.next;
  }
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

  // Решение печатает результат, поэтому вывод перехватывается для сравнения
  const written = [];
  const originalWrite = process.stdout.write.bind(process.stdout);

  process.stdout.write = (chunk) => {
    written.push(chunk);
    return true;
  };

  solution(list);
  process.stdout.write = originalWrite;

  assert.strictEqual(written.join(''), 'node0\nnode1\nnode2\nnode3\n');

  console.log('b.js: OK');
}
