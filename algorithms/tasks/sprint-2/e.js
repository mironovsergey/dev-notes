/**
 * E. Все наоборот
 *
 * https://github.com/Yandex-Practicum/algorithms-templates/blob/main/js/sprint2/E/code.js
 * https://contest.yandex.ru/contest/22779/problems/E/
 *
 * Вася решил запутать маму - делать дела в обратном порядке. Список его дел
 * теперь хранится в двусвязном списке. Напишите функцию, которая вернет список
 * в обратном порядке.
 *
 * Формат ввода
 * Функция принимает на вход единственный аргумент - голову двусвязного списка.
 * Длина списка не превосходит 1000 элементов. Список не бывает пустым.
 *
 * Формат вывода
 * Функция должна вернуть голову развернутого списка.
 */

/**
 * Разворачивает двусвязный список.
 *
 * У каждого узла ссылки next и prev меняются местами, поэтому новой головой
 * становится бывший хвост. Ссылка на следующий узел сохраняется до перезаписи:
 * иначе после присваивания currNode.next перейти дальше будет некуда.
 *
 * Время: O(n). Память: O(1).
 *
 * @param {Node|null} node Голова исходного списка.
 * @returns {Node|null} Голова развернутого списка.
 */
function solution(node) {
  let currNode = node;
  let prevNode = null;

  while (currNode !== null) {
    const nextNode = currNode.next;

    currNode.next = prevNode;
    currNode.prev = nextNode;

    prevNode = currNode;
    currNode = nextNode;
  }

  return prevNode;
}

// Локальная проверка. Проверяющая система объявляет класс Node самостоятельно,
// поэтому и объявление, и тесты выполняются только при локальном запуске.
// Объявление внутри блока видно лишь внутри него - это ровно то, что нужно.
if (process.env.REMOTE_JUDGE !== 'true') {
  const assert = require('assert');

  class Node {
    constructor(value = null, next = null, prev = null) {
      this.value = value;
      this.next = next;
      this.prev = prev;
    }
  }

  const node3 = new Node('node3');
  const node2 = new Node('node2', node3);
  const node1 = new Node('node1', node2);
  const node0 = new Node('node0', node1);

  node1.prev = node0;
  node2.prev = node1;
  node3.prev = node2;

  const newHead = solution(node0);

  assert.strictEqual(newHead, node3);
  assert.strictEqual(node3.prev, null);
  assert.strictEqual(node3.next, node2);
  assert.strictEqual(node2.prev, node3);
  assert.strictEqual(node2.next, node1);
  assert.strictEqual(node1.prev, node2);
  assert.strictEqual(node1.next, node0);
  assert.strictEqual(node0.prev, node1);
  assert.strictEqual(node0.next, null);

  // Список из одного узла: голова не меняется, обе ссылки пусты
  const single = new Node('only');

  assert.strictEqual(solution(single), single);
  assert.strictEqual(single.next, null);
  assert.strictEqual(single.prev, null);

  console.log('e.js: OK');
}
