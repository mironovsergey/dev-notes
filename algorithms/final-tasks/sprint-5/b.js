/**
 * B. Удали узел
 *
 * https://contest.yandex.ru/contest/24810/problems/B/
 *
 * Дано бинарное дерево поиска, в котором хранятся ключи. Ключи - уникальные
 * целые числа. Найдите вершину с заданным ключом и удалите ее из дерева так,
 * чтобы дерево осталось корректным бинарным деревом поиска. Если ключа в дереве
 * нет, то изменять дерево не надо.
 *
 * На вход вашей функции подается корень дерева и ключ, который надо удалить.
 * Функция должна вернуть корень измененного дерева. Сложность удаления узла
 * должна составлять O(h), где h - высота дерева.
 *
 * Создавать новые вершины нельзя.
 *
 * Формат ввода
 * Ключи дерева – натуральные числа, не превышающие 10^9. В итоговом решении
 * не надо определять свою структуру/свой класс, описывающий вершину дерева.
 *
 * Отчет: https://contest.yandex.ru/contest/24810/run-report/111802224/
 */

/**
 * Находит узел с заданным значением в бинарном дереве поиска
 * @param {Node} root Корневой узел
 * @param {number} value Значение, которое нужно найти
 * @returns {Node|null} Найденный узел или null, если узел не найден
 */
function findNode(root, value) {
  while (root !== null && root.value !== value) {
    if (value < root.value) {
      root = root.left;
    } else {
      root = root.right;
    }
  }
  return root;
}

/**
 * Находит узел с максимальным значением в бинарном дереве поиска,
 * начиная с заданного узла
 * @param {Node} node Корень дерева или поддерева
 * @returns {Node} Узел с максимальным значением
 */
function findMaxNode(node) {
  while (node.right !== null) {
    node = node.right;
  }
  return node;
}

/**
 * Находит узел с минимальным значением в бинарном дереве поиска,
 * начиная с заданного узла
 * @param {Node} node Корень дерева или поддерева
 * @returns {Node} Узел с минимальным значением
 */
function findMinNode(node) {
  while (node.left !== null) {
    node = node.left;
  }
  return node;
}

/**
 * Находит родительский узел для данного узла в бинарном дереве поиска
 * @param {Node} root Корень дерева
 * @param {Node} node Узел, для которого нужно найти родителя
 * @returns {Node|null} Родительский узел или null, если узел является корнем
 */
function findParentNode(root, node) {
  // Если текущий узел является корнем, возвращаем null,
  // так как у корня нет родителя
  if (node === root) {
    return null;
  }

  let parentNode = null;
  let currentNode = root;

  // Итеративно спускаемся по дереву, пока не найдем узел
  // или его потенциального родителя
  while (currentNode !== null && currentNode !== node) {
    parentNode = currentNode;

    if (node.value < currentNode.value) {
      currentNode = currentNode.left;
    } else {
      currentNode = currentNode.right;
    }
  }

  return currentNode === node ? parentNode : null;
}

/**
 * Заменяет поддерево узла node поддеревом с корнем в узле targetNode
 * @param {Node} root Корень дерева
 * @param {Node} node Узел, который нужно заменить
 * @param {Node} targetNode Узел, на который нужно заменить node
 * @returns {Node} Новый корневой узел дерева после замены
 */
function transplant(root, node, targetNode) {
  // Находим родительский узел для узла, который нужно заменить
  let parentNode = findParentNode(root, node);

  // Если узел, который нужно заменить, является корневым,
  // заменяем корневой узел на целевой узел
  if (parentNode === null) {
    root = targetNode;
  }
  // Если узел node является левым потомком родительского узла,
  // заменяем левого потомка родительского узла на целевой узел
  else if (node === parentNode.left) {
    parentNode.left = targetNode;
  }
  // Если узел node является правым потомком родительского узла,
  // заменяем правого потомка родительского узла на целевой узел
  else {
    parentNode.right = targetNode;
  }

  // Возвращаем новый корневой узел дерева после замены
  return root;
}

/**
 * Удаляет узел из бинарного дерева поиска
 * @param {Node} root Корень дерева
 * @param {number} key Ключ узла, который нужно удалить
 * @returns {Node} Новый корневой узел дерева после удаления
 */
function remove(root, key) {
  // Находим узел с заданным ключом
  let node = findNode(root, key);

  // Если узел не найден, возвращаем корневой узел без изменений
  if (node === null) {
    return root;
  }

  // Если у удаляемого узла отсутствует левое поддерево,
  // заменяем его на правое поддерево
  if (node.left === null) {
    return transplant(root, node, node.right);
  }
  // Если у удаляемого узла отсутствует правое поддерево,
  // заменяем его на левое поддерево
  else if (node.right === null) {
    return transplant(root, node, node.left);
  }
  // Если у удаляемого узла есть оба поддерева
  else {
    // Находим минимальный узел из правого поддерева
    const minRightNode = findMinNode(node.right);

    // Если минимальный узел не является прямым потомком удаляемого узла,
    // заменяем минимальный узел его правым потомком
    if (findParentNode(root, minRightNode) !== node) {
      transplant(root, minRightNode, minRightNode.right);
      minRightNode.right = node.right;
    }

    // Заменяем удаляемый узел на минимальный узел из правого поддерева
    const newRoot = transplant(root, node, minRightNode);

    // Переносим левое поддерево удаляемого узла к минимальному узлу
    // из правого поддерева
    minRightNode.left = node.left;

    // Возвращаем новый корневой узел дерева после удаления
    return newRoot;
  }
}

// Локальная проверка. Проверяющая система объявляет класс Node самостоятельно,
// поэтому и объявление, и тесты выполняются только при локальном запуске.
if (process.env.REMOTE_JUDGE !== 'true') {
  const assert = require('assert');

  class Node {
    constructor(value, left = null, right = null) {
      this.value = value;
      this.left = left;
      this.right = right;
    }
  }

  const insert = (node, value) => {
    if (node === null) {
      return new Node(value);
    }

    if (value < node.value) {
      node.left = insert(node.left, value);
    } else if (value > node.value) {
      node.right = insert(node.right, value);
    }

    return node;
  };

  const build = (values) => values.reduce((acc, value) => insert(acc, value), null);

  const inorder = (node, out = []) => {
    if (node === null) {
      return out;
    }

    inorder(node.left, out);
    out.push(node.value);
    inorder(node.right, out);

    return out;
  };

  const isBst = (node, low = -Infinity, high = Infinity) =>
    node === null ||
    (node.value > low &&
      node.value < high &&
      isBst(node.left, low, node.value) &&
      isBst(node.right, node.value, high));

  const collect = (node, out = []) => {
    if (node === null) {
      return out;
    }

    out.push(node);
    collect(node.left, out);
    collect(node.right, out);

    return out;
  };

  const example = build([5, 1, 3, 2, 10, 8, 6]);
  const withoutTen = remove(example, 10);

  assert.strictEqual(withoutTen.value, 5);
  assert.strictEqual(withoutTen.right.value, 8);
  assert.deepStrictEqual(inorder(withoutTen), [1, 2, 3, 5, 6, 8]);

  // Удаление отсутствующего ключа не меняет дерево
  assert.deepStrictEqual(inorder(remove(withoutTen, 999)), [1, 2, 3, 5, 6, 8]);

  // Все ключи всех случайных деревьев
  for (let t = 0; t < 5000; t++) {
    const values = [
      ...new Set(
        Array.from({ length: 1 + Math.floor(Math.random() * 14) }, () =>
          Math.floor(Math.random() * 30),
        ),
      ),
    ];
    const sorted = values.slice().sort((a, b) => a - b);

    for (const key of sorted) {
      const root = build(values);
      const removed = collect(root).find((node) => node.value === key);
      const result = remove(root, key);

      assert.ok(isBst(result), `после удаления ${key} нарушено свойство BST`);
      assert.deepStrictEqual(
        inorder(result),
        sorted.filter((value) => value !== key),
        `удаление ключа ${key}`,
      );
      assert.ok(
        !collect(result).includes(removed),
        `объект вершины ${key} должен быть исключен, а не получить чужое значение`,
      );
    }
  }

  console.log('b.js: OK');
}
