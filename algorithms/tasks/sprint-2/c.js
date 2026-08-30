/**
 * C. Нелюбимое дело
 *
 * https://github.com/Yandex-Practicum/algorithms-templates/blob/main/js/sprint2/C/code.js
 * https://contest.yandex.ru/contest/22779/problems/C/
 *
 * Вася размышляет, что ему можно не делать из того списка дел, который он
 * составил. Но, кажется, все пункты очень важные! Вася решает загадать число
 * и удалить дело, которое идет под этим номером. Список дел представлен в виде
 * односвязного списка. Напишите функцию solution, которая принимает на вход
 * голову списка и номер удаляемого дела и возвращает голову обновленного
 * списка.
 *
 * Формат ввода
 * Функция принимает голову списка и индекс элемента, который надо удалить
 * (нумерация с нуля). Список содержит не более 5000 элементов. Список не бывает
 * пустым.
 *
 * Формат вывода
 * Верните голову списка, в котором удален нужный элемент.
 */

/**
 * Удаляет узел с заданным индексом и возвращает голову обновленного списка.
 *
 * Удаление первого узла меняет голову списка, поэтому обрабатывается отдельно.
 * В остальных случаях требуется предыдущий узел: перейти к нему по ссылкам
 * нельзя, они ведут только вперед, поэтому он ищется от головы.
 *
 * Время: O(idx). Память: O(1).
 *
 * @param {Node} node Голова непустого списка.
 * @param {number} idx Индекс удаляемого узла, нумерация с нуля.
 * @returns {Node|null} Голова обновленного списка.
 */
function solution(node, idx) {
  // Если нужно удалить первый элемент, обновляем голову списка
  if (idx === 0) {
    return node.next;
  }

  let currNode = node;
  let prevNode = null;
  let count = 0;

  // Перебираем узлы списка до тех пор, пока не достигнем указанного индекса
  while (currNode !== null && count < idx) {
    prevNode = currNode;
    currNode = currNode.next;
    count++;
  }

  // Если достигли конца списка, либо idx выходит за пределы списка,
  // ничего не делаем
  if (currNode === null) {
    return node;
  }

  // Удаляем узел, обновляя указатели
  prevNode.next = currNode.next;

  return node;
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

  const build = (values) => {
    let head = null;

    for (let i = values.length - 1; i >= 0; i--) {
      head = new Node(values[i], head);
    }

    return head;
  };

  const toArray = (head) => {
    const values = [];

    for (let node = head; node !== null; node = node.next) {
      values.push(node.value);
    }

    return values;
  };

  assert.deepStrictEqual(toArray(solution(build(['a', 'b', 'c', 'd']), 1)), [
    'a',
    'c',
    'd',
  ]);
  assert.deepStrictEqual(toArray(solution(build(['a', 'b', 'c']), 0)), [
    'b',
    'c',
  ]);
  assert.deepStrictEqual(toArray(solution(build(['a', 'b', 'c']), 2)), [
    'a',
    'b',
  ]);
  assert.deepStrictEqual(toArray(solution(build(['a']), 0)), []);

  console.log('c.js: OK');
}
