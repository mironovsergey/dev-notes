/**
 * B. Сбалансированное дерево
 *
 * https://contest.yandex.ru/contest/24809/problems/B/
 *
 * Гоше очень понравилось слушать рассказ Тимофея про деревья. Особенно часть
 * про сбалансированные деревья. Он решил написать функцию, которая определяет,
 * сбалансировано ли дерево.
 *
 * Дерево считается сбалансированным, если левое и правое поддеревья каждой
 * вершины отличаются по высоте не больше, чем на единицу.
 *
 * Формат ввода
 * На вход функции подается корень бинарного дерева.
 *
 * Формат вывода
 * Функция должна вернуть True, если дерево сбалансировано в соответствии
 * с критерием из условия, иначе - False.
 */

// Признак того, что в поддереве уже обнаружено нарушение балансировки
const UNBALANCED = -1;

/**
 * Проверяет, сбалансировано ли дерево по критерию высоты.
 *
 * Высота и признак нарушения вычисляются одним обходом: функция возвращает либо
 * высоту поддерева, либо UNBALANCED, если нарушение уже найдено. Отдельное
 * вычисление высоты для каждой вершины давало бы O(n²) - на цепочке из 10^4
 * вершин это 10^8 операций.
 *
 * Время: O(n). Память: O(h) на кадры стека вызовов.
 *
 * @param {CNode|null} root Корень дерева.
 * @returns {boolean} true, если высоты поддеревьев каждой вершины различаются
 *   не более чем на единицу.
 */
function solution(root) {
  function measure(node) {
    if (node === null) {
      return 0;
    }

    const leftHeight = measure(node.left);

    if (leftHeight === UNBALANCED) {
      return UNBALANCED;
    }

    const rightHeight = measure(node.right);

    if (rightHeight === UNBALANCED) {
      return UNBALANCED;
    }

    if (Math.abs(leftHeight - rightHeight) > 1) {
      return UNBALANCED;
    }

    return 1 + Math.max(leftHeight, rightHeight);
  }

  return measure(root) !== UNBALANCED;
}

// Локальная проверка. Проверяющая система объявляет класс CNode самостоятельно,
// поэтому и объявление, и тесты выполняются только при локальном запуске.
// Объявление внутри блока видно лишь внутри него - это ровно то, что нужно.
if (process.env.REMOTE_JUDGE !== 'true') {
  const assert = require('assert');

  class CNode {
    constructor(value) {
      this.value = value;
      this.left = null;
      this.right = null;
    }
  }

  const build = (value, left = null, right = null) => {
    const node = new CNode(value);
    node.left = left;
    node.right = right;
    return node;
  };

  assert.strictEqual(solution(build(2, build(3, build(1), build(-5)), build(10))), true);
  assert.strictEqual(solution(null), true);
  assert.strictEqual(solution(build(1)), true);
  // Цепочка из трех вершин: высоты поддеревьев корня 2 и 0
  assert.strictEqual(solution(build(1, build(2, build(3)))), false);

  console.log('b.js: OK');
}
