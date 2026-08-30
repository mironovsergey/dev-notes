/**
 * A. Лампочки
 *
 * https://contest.yandex.ru/contest/24809/problems/A/
 *
 * Гоша повесил на стену гирлянду в виде бинарного дерева, в узлах которого
 * находятся лампочки. У каждой лампочки есть своя яркость. Уровень яркости
 * лампочки соответствует числу, расположенному в узле дерева. Помогите Гоше
 * найти самую яркую лампочку в гирлянде, то есть такую, у которой яркость
 * наибольшая.
 *
 * Формат ввода
 * На вход подается корень дерева.
 *
 * Формат вывода
 * Функция должна вернуть максимальное значение яркости в узле дерева.
 */

/**
 * Возвращает максимальное значение в бинарном дереве.
 *
 * Время: O(n). Память: O(h) на кадры стека вызовов.
 *
 * @param {CNode|null} root Корень дерева.
 * @returns {number|null} Максимум либо null для пустого дерева.
 */
function solution(root) {
  // Если дерево пустое, возвращаем null
  if (!root) {
    return null;
  }

  let maxValue = root.value;

  // Рекурсивно обходим левое и правое поддеревья
  if (root.left) {
    maxValue = Math.max(maxValue, solution(root.left));
  }

  if (root.right) {
    maxValue = Math.max(maxValue, solution(root.right));
  }

  return maxValue;
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

  assert.strictEqual(solution(build(2, build(3, build(1), build(-5)))), 3);
  assert.strictEqual(solution(build(7)), 7);
  assert.strictEqual(solution(build(-3, build(-9), build(-5))), -3);
  assert.strictEqual(solution(null), null);

  console.log('a.js: OK');
}
