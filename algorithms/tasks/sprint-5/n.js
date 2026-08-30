/**
 * N. Разбиение дерева
 *
 * https://contest.yandex.ru/contest/24809/problems/N/
 *
 * Дано бинарное дерево поиска, в котором хранятся целые числа. От этого дерева
 * надо отделить k самых маленьких элементов.
 *
 * Реализуйте функцию, которая принимает корень дерева и число k, а возвращает
 * два BST - в первом k наименьших элементов из исходного дерева, а во втором -
 * оставшиеся вершины BST.
 *
 * В вершинах дерева уже записаны корректные размеры поддеревьев. После
 * разбиения размеры должны остаться корректными - вам придется пересчитывать
 * их на ходу.
 *
 * Ваше решение должно иметь асимптотику O(h), где h - высота исходного дерева.
 *
 * Формат ввода
 * Числа, записанные в вершинах дерева, лежат в диапазоне от 0 до 10^9. Дерево
 * не содержит одинаковых ключей. Число вершин в дереве не превосходит 10^5.
 */

/**
 * Возвращает размер поддерева, корректно обрабатывая пустое.
 *
 * Время: O(1).
 *
 * @param {Node|null} node Корень поддерева.
 * @returns {number} Количество вершин, 0 для пустого поддерева.
 */
function size(node) {
  return node === null ? 0 : node.size;
}

/**
 * Пересчитывает размер вершины по размерам ее детей.
 *
 * Время: O(1).
 *
 * @param {Node} node Вершина, размер которой устарел.
 * @returns {void}
 */
function updateSize(node) {
  node.size = 1 + size(node.left) + size(node.right);
}

/**
 * Разбивает дерево поиска на два: k наименьших ключей и все остальные.
 *
 * На прямом ходу рекурсия спускается по одному пути, сравнивая k с размером
 * левого поддерева и определяя точку разделения; на обратном - собирает две
 * части и пересчитывает размеры, поэтому они остаются корректными.
 *
 * Если размер левого поддерева не меньше k, то все k наименьших ключей лежат
 * в нем, а сама вершина со своим правым поддеревом уходит во второе дерево.
 * Иначе вершина и все левое поддерево уходят в первое, а разделение
 * продолжается в правом поддереве с уменьшенным на leftSize + 1 значением k.
 *
 * На каждом уровне выполняется ровно один рекурсивный вызов, поэтому обход
 * идет по одному пути от корня.
 *
 * Время: O(h). Память: O(h) на кадры стека вызовов.
 *
 * @param {Node|null} node Корень дерева с корректными размерами поддеревьев.
 * @param {number} k Количество наименьших ключей для первого дерева.
 * @returns {[Node|null, Node|null]} Корни двух деревьев.
 */
function split(node, k) {
  if (node === null) {
    return [null, null];
  }

  const leftSize = size(node.left);

  if (leftSize >= k) {
    const [first, second] = split(node.left, k);

    node.left = second;
    updateSize(node);

    return [first, node];
  }

  const [first, second] = split(node.right, k - leftSize - 1);

  node.right = first;
  updateSize(node);

  return [node, second];
}

// Локальная проверка. Проверяющая система объявляет класс Node самостоятельно,
// поэтому и объявление, и тесты выполняются только при локальном запуске.
if (process.env.REMOTE_JUDGE !== 'true') {
  const assert = require('assert');

  class Node {
    constructor(value, left = null, right = null, size = 0) {
      this.value = value;
      this.left = left;
      this.right = right;
      this.size = size;
    }
  }

  const build = (values) => {
    let root = null;

    const insert = (node, value) => {
      if (node === null) {
        return new Node(value, null, null, 1);
      }

      if (value < node.value) {
        node.left = insert(node.left, value);
      } else {
        node.right = insert(node.right, value);
      }

      updateSize(node);

      return node;
    };

    for (const value of values) {
      root = insert(root, value);
    }

    return root;
  };

  const inorder = (node, out = []) => {
    if (node === null) {
      return out;
    }

    inorder(node.left, out);
    out.push(node.value);
    inorder(node.right, out);

    return out;
  };

  const checkSizes = (node) => {
    if (node === null) {
      return 0;
    }

    const actual = 1 + checkSizes(node.left) + checkSizes(node.right);
    assert.strictEqual(node.size, actual, `размер у ключа ${node.value}`);

    return actual;
  };

  const example = build([5, 2, 3, 10, 8, 11]);
  const [first, second] = split(example, 4);

  assert.strictEqual(first.size, 4);
  assert.strictEqual(second.size, 2);
  assert.deepStrictEqual(inorder(first), [2, 3, 5, 8]);
  assert.deepStrictEqual(inorder(second), [10, 11]);

  // Все точки разделения на случайных деревьях
  for (let t = 0; t < 3000; t++) {
    const values = [
      ...new Set(
        Array.from({ length: 1 + Math.floor(Math.random() * 14) }, () =>
          Math.floor(Math.random() * 40),
        ),
      ),
    ];
    const sorted = values.slice().sort((a, b) => a - b);
    const k = Math.floor(Math.random() * (sorted.length + 1));
    const [left, right] = split(build(values), k);

    assert.deepStrictEqual(inorder(left), sorted.slice(0, k), `k = ${k}`);
    assert.deepStrictEqual(inorder(right), sorted.slice(k), `k = ${k}`);
    checkSizes(left);
    checkSizes(right);
  }

  console.log('n.js: OK');
}
