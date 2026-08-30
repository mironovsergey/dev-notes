/**
 * C. Дерево - анаграмма
 *
 * https://contest.yandex.ru/contest/24809/problems/C/
 *
 * Гоша и Алла играют в игру «Удивительные деревья». Помогите ребятам
 * определить, является ли дерево, которое им встретилось, деревом-анаграммой?
 *
 * Дерево называется анаграммой, если оно симметрично относительно своего
 * центра.
 *
 * Формат ввода
 * На вход подается корень дерева.
 *
 * Формат вывода
 * Функция должна вернуть True если дерево является анаграммой. Иначе - False.
 */

/**
 * Проверяет, симметрично ли дерево относительно своего центра.
 *
 * Сравниваются пары вершин, отраженных друг в друга: левый потомок одной
 * сопоставляется правому потомку другой и наоборот.
 *
 * Время: O(n). Память: O(h) на кадры стека вызовов.
 *
 * @param {CNode|null} root Корень дерева.
 * @returns {boolean} true, если дерево симметрично.
 */
function solution(root) {
  // Рекурсивная вспомогательная функция
  function isAnagram(leftNode, rightNode) {
    // Если обе ветви пусты, то это симметричное дерево
    if (leftNode === null && rightNode === null) {
      return true;
    }

    // Если одна из ветвей пуста, то дерево несимметричное
    if (leftNode === null || rightNode === null) {
      return false;
    }

    // Проверяем, что значения узлов симметричны,
    // и рекурсивно проверяем их потомков
    return (
      leftNode.value === rightNode.value &&
      isAnagram(leftNode.left, rightNode.right) &&
      isAnagram(leftNode.right, rightNode.left)
    );
  }

  // Если дерево пустое, то считаем его деревом-анаграммой
  if (root === null) {
    return true;
  }

  // Вызываем вспомогательную функцию для проверки симметрии
  return isAnagram(root.left, root.right);
}

// Локальная проверка. Проверяющая система объявляет класс CNode самостоятельно,
// поэтому и объявление, и тесты выполняются только при локальном запуске.
// Объявление внутри блока видно лишь внутри него - это ровно то, что нужно.
if (process.env.REMOTE_JUDGE !== 'true') {
  const assert = require('assert');

  class CNode {
    constructor(value, left = null, right = null) {
      this.value = value;
      this.left = left;
      this.right = right;
    }
  }

  assert.strictEqual(
    solution(new CNode(1, new CNode(2, new CNode(3), new CNode(4)), new CNode(2, new CNode(4), new CNode(3)))),
    true,
  );
  assert.strictEqual(solution(null), true);
  assert.strictEqual(solution(new CNode(1)), true);
  // Значения совпадают, но структура зеркально не сходится
  assert.strictEqual(solution(new CNode(1, new CNode(2, null, new CNode(3)), new CNode(2, null, new CNode(3)))), false);

  console.log('c.js: OK');
}
