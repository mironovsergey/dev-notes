/**
 * G. Максимальное расстояние
 *
 * https://contest.yandex.ru/contest/25069/problems/G/
 *
 * Под расстоянием между двумя вершинами в графе будем понимать длину
 * кратчайшего пути между ними в ребрах. Для данной вершины s определите
 * максимальное расстояние от нее до другой вершины неориентированного графа.
 *
 * Формат ввода
 * В первой строке дано количество вершин n (1 ≤ n ≤ 10^5) и ребер
 * m (0 ≤ m ≤ 10^5). Далее в m строках описаны ребра графа. Каждое ребро
 * описывается номерами двух вершин u и v (1 ≤ u, v ≤ n). В последней строке дан
 * номер вершины s (1 ≤ s ≤ n).
 *
 * Гарантируется, что граф связный и что в нем нет петель и кратных ребер.
 *
 * Формат вывода
 * Выведите длину наибольшего пути от s до одной из вершин графа.
 */

const { run, readInt, readLine } = require('../../lib/io');

function solve() {
  // Чтение числа вершин (n) и числа ребер (m)
  const [n, m] = readLine().trim().split(' ').map(Number);

  // Массив ребер графа
  const edges = [];

  // Чтение всех ребер
  for (let i = 1; i <= m; i++) {
    edges.push(readLine().trim().split(' ').map(Number));
  }

  // Чтение номера стартовой вершины
  const s = readInt();

  // Создание списка смежности
  const adjacencyList = createAdjacencyList(n, edges);

  // Поиск максимального расстояния от вершины s
  const maxDistance = findMaxDistance(n, s, adjacencyList);

  // Вывод результата
  process.stdout.write(`${maxDistance}`);
}

function createAdjacencyList(n, edges) {
  const adjacencyList = Array.from({ length: n + 1 }, () => []);

  for (const [u, v] of edges) {
    adjacencyList[u].push(v);
    adjacencyList[v].push(u);
  }

  return adjacencyList;
}

class Node {
  constructor(value) {
    this.value = value;
    this.next = null;
    this.prev = null;
  }
}

class Deque {
  constructor() {
    this.head = null;
    this.tail = null;
    this.length = 0;
  }

  push(value) {
    const newNode = new Node(value);

    if (this.length === 0) {
      this.head = newNode;
      this.tail = newNode;
    } else {
      this.tail.next = newNode;
      newNode.prev = this.tail;
      this.tail = newNode;
    }

    this.length++;
  }

  shift() {
    if (this.length === 0) {
      return null;
    }

    const value = this.head.value;

    this.head = this.head.next;

    if (this.head) {
      this.head.prev = null;
    } else {
      this.tail = null;
    }

    this.length--;

    return value;
  }
}

/**
 * Возвращает наибольшее расстояние от заданной вершины до достижимых из нее.
 *
 * Максимум ищется циклом, а не через Math.max(...distances): развертывание
 * массива в аргументы упирается в предел стека вызовов. При n = 10^5 из
 * условия вызов еще проходит, но уже при 2·10^5 элементов он падает
 * с RangeError, то есть запаса нет.
 *
 * Значение -1 у недостижимых вершин на максимум не влияет: расстояние до самой
 * стартовой вершины равно 0, поэтому максимум всегда неотрицателен.
 *
 * Время: O(|V| + |E|). Память: O(|V|).
 *
 * @param {number} n Количество вершин.
 * @param {number} startVertex Стартовая вершина.
 * @param {number[][]} adjacencyList Списки смежности.
 * @returns {number} Наибольшее расстояние до достижимой вершины.
 */
function findMaxDistance(n, startVertex, adjacencyList) {
  const distances = Array(n + 1).fill(-1);
  const queue = new Deque();

  distances[startVertex] = 0;
  queue.push(startVertex);

  while (queue.length > 0) {
    const currentVertex = queue.shift();

    for (const neighbor of adjacencyList[currentVertex]) {
      if (distances[neighbor] === -1) {
        distances[neighbor] = distances[currentVertex] + 1;
        queue.push(neighbor);
      }
    }
  }

  let maxDistance = 0;

  for (let v = 1; v <= n; v++) {
    if (distances[v] > maxDistance) {
      maxDistance = distances[v];
    }
  }

  return maxDistance;
}

run(solve);
