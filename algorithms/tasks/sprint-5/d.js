/**
 * D. Деревья - близнецы
 *
 * https://contest.yandex.ru/contest/24809/problems/D/
 *
 * Гоше на день рождения подарили два дерева. Тимофей сказал, что они совершенно
 * одинаковые. Но, по мнению Гоши, они отличаются.
 *
 * Помогите разрешить этот философский спор!
 *
 * Формат ввода
 * На вход подаются корни двух деревьев.
 *
 * Формат вывода
 * Функция должна вернуть True если деревья являются близнецами. Иначе - False.
 */

/**
 * Проверяет, совпадают ли два дерева по структуре и значениям.
 *
 * Время: O(n). Память: O(h) на кадры стека вызовов.
 *
 * @param {CNode|null} root1 Корень первого дерева.
 * @param {CNode|null} root2 Корень второго дерева.
 * @returns {boolean} true, если деревья идентичны.
 */
function solution(root1, root2) {
  // Если оба узла пусты, они равны
  if (root1 === null && root2 === null) {
    return true;
  }

  // Если один из узлов пуст, а другой нет, они не равны
  if (root1 === null || root2 === null) {
    return false;
  }

  // Проверяем, что значения текущих узлов равны
  if (root1.value !== root2.value) {
    return false;
  }

  // Рекурсивно проверяем левые и правые поддеревья
  return solution(root1.left, root2.left) && solution(root1.right, root2.right);
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

  const first = new CNode(3, new CNode(1), new CNode(2));
  const second = new CNode(3, new CNode(1), new CNode(2));

  assert.strictEqual(solution(first, second), true);
  assert.strictEqual(solution(null, null), true);
  assert.strictEqual(solution(first, null), false);
  assert.strictEqual(solution(first, new CNode(3, new CNode(1))), false);
  assert.strictEqual(solution(first, new CNode(3, new CNode(9), new CNode(2))), false);

  console.log('d.js: OK');
}
