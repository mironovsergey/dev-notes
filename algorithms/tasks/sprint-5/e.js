/**
 * E. Дерево поиска
 *
 * https://contest.yandex.ru/contest/24809/problems/E/
 *
 * Гоша понял, что такое дерево поиска, и захотел написать функцию, которая
 * определяет, является ли заданное дерево деревом поиска. Значения в левом
 * поддереве должны быть строго меньше, в правом -- строго больше значения
 * в узле.
 *
 * Формат ввода
 * На вход функции подается корень бинарного дерева.
 *
 * Формат вывода
 * Функция должна вернуть True, если дерево является деревом поиска,
 * иначе - False.
 */

/**
 * Проверяет, является ли дерево деревом поиска.
 *
 * Проверка ведется по допустимому интервалу значений, сужающемуся при спуске.
 * Сравнения только с непосредственными детьми недостаточно: нарушение может
 * находиться сколь угодно глубоко - например, в дереве 8(3(1, 9), 10) вершина 9
 * больше корня, но лежит в его левом поддереве.
 *
 * Границы строгие, как требует условие: значения слева должны быть строго
 * меньше, справа - строго больше.
 *
 * Время: O(n). Память: O(h) на кадры стека вызовов.
 *
 * @param {CNode|null} root Корень дерева.
 * @returns {boolean} true, если дерево является деревом поиска.
 */
function solution(root) {
  function isBST(node, min, max) {
    // Если узел пуст, то это дерево поиска
    if (node === null) {
      return true;
    }

    // Если значение узла находится вне допустимого диапазона,
    // то это не дерево поиска
    if (node.value <= min || node.value >= max) {
      return false;
    }

    // Рекурсивно проверяем левое и правое поддеревья
    // с обновлением диапазона значений
    return (
      isBST(node.left, min, node.value) && isBST(node.right, node.value, max)
    );
  }

  // Вызываем вспомогательную рекурсивную функцию,
  // начиная с корня дерева
  return isBST(root, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY);
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

  const right = new CNode(8);
  const root = new CNode(5, new CNode(3, new CNode(1), new CNode(4)), right);

  assert.strictEqual(solution(root), true);

  // Значение равно корню: по условию требуется строгое неравенство
  right.value = 5;
  assert.strictEqual(solution(root), false);

  // Нарушение в глубине, а не у непосредственного ребенка
  assert.strictEqual(
    solution(new CNode(8, new CNode(3, new CNode(1), new CNode(9)), new CNode(10))),
    false,
  );
  assert.strictEqual(solution(null), true);

  console.log('e.js: OK');
}
