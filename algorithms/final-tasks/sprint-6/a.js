/**
 * A. Дорогая сеть
 *
 * https://contest.yandex.ru/contest/25070/problems/A/
 *
 * Тимофей решил соединить все компьютеры в своей компании в единую сеть. Для
 * этого он придумал построить минимальное остовное дерево, чтобы эффективнее
 * использовать ресурсы.
 *
 * Но от начальства пришла новость о том, что выделенный на сеть бюджет оказался
 * очень большим и его срочно надо израсходовать. Поэтому Тимофея теперь
 * интересуют не минимальные, а максимальные остовные деревья.
 *
 * Он поручил вам найти вес такого максимального остовного дерева
 * в неориентированном графе, который задает схему офиса.
 *
 * Формат ввода
 * В первой строке дано количество вершин n и ребер m графа
 * (1 ≤ n ≤ 1000, 0 ≤ m ≤ 100000). В каждой из следующих m строк заданы ребра
 * в виде троек чисел u, v, w. u и v - вершины, которые соединяет это ребро.
 * w - его вес ( 1 ≤ u, v ≤ n, 0 ≤ w ≤ 10000). В графе могут быть петли
 * и кратные ребра. Граф может оказаться несвязным.
 *
 * Формат вывода
 * Если максимальное остовное дерево существует, то выведите его вес. Иначе
 * (если в графе несколько компонент связности) выведите фразу
 * «Oops! I did it again».
 *
 * Отчет: https://contest.yandex.ru/contest/25070/run-report/115935947/
 */

const { run, readLine } = require('../../lib/io');

const DISCONNECTED_MESSAGE = 'Oops! I did it again';

function solve() {
  // Чтение числа вершин (n) и числа ребер (m)
  const [n, m] = readLine().trim().split(' ').map(Number);

  // Массив ребер графа
  const edges = [];

  for (let i = 1; i <= m; i++) {
    edges.push(readLine().trim().split(' ').map(Number));
  }

  const adjacencyList = createAdjacencyList(n, edges);

  const mst = new Graph(adjacencyList).findMST();

  if (mst === null) {
    process.stdout.write(DISCONNECTED_MESSAGE);
    return;
  }

  process.stdout.write(`${mst.reduce((acc, { weight }) => acc + weight, 0)}`);
}

/**
 * Создает список смежности для неориентированного графа
 * @param {number} n Количество вершин в графе
 * @param {number[][]} edges Массив ребер графа
 * @returns {Edge[][]} Список смежности графа
 */
function createAdjacencyList(n, edges) {
  const adjacencyList = Array.from({ length: n + 1 }, () => []);

  for (const [u, v, w] of edges) {
    adjacencyList[u].push(new Edge(u, v, w));
    adjacencyList[v].push(new Edge(v, u, w));
  }

  return adjacencyList;
}

/**
 * Класс, представляющий ребро графа
 */
class Edge {
  /**
   * Создает ребро графа
   * @param {number} from Вершина начала ребра
   * @param {number} to Вершина конца ребра
   * @param {number} weight Вес ребра
   */
  constructor(from, to, weight) {
    this.from = from;
    this.to = to;
    this.weight = weight;
  }

  /**
   * Сравнивает текущее ребро с другим ребром
   * @param {Edge} edge Ребро для сравнения
   * @returns {boolean} Возвращает true, если текущее ребро имеет больший вес
   */
  compare(edge) {
    return this.weight > edge.weight;
  }
}

/**
 * Класс, представляющий невозрастающую кучу
 */
class Heap {
  /**
   * Создает кучу
   */
  constructor() {
    this.elements = [null];
  }

  /**
   * Добавляет элемент в кучу
   * @param {Edge} element Ребро графа
   */
  add(element) {
    this.elements.push(element);
    this.siftUp(this.elements.length - 1);
  }

  /**
   * Восстанавливает свойство кучи после добавления элемента
   * @param {number} index Индекс элемента, который нужно переместить вверх
   * @returns
   */
  siftUp(index) {
    if (index === 1) {
      return;
    }

    const parentIndex = Math.floor(index / 2);

    if (this.elements[index].compare(this.elements[parentIndex])) {
      [this.elements[parentIndex], this.elements[index]] = [
        this.elements[index],
        this.elements[parentIndex],
      ];

      this.siftUp(parentIndex);
    }
  }

  /**
   * Удаляет и возвращает максимальный элемент из кучи
   * @returns {Edge|null} Максимальное ребро или null, если куча пуста
   */
  popMax() {
    if (this.elements.length === 1) {
      return null;
    }

    const max = this.elements[1];

    this.elements[1] = this.elements[this.elements.length - 1];
    this.elements.pop();
    this.siftDown(1);

    return max;
  }

  /**
   * Восстанавливает свойство кучи после удаления максимального элемента
   * @param {number} index Индекс элемента, который нужно переместить вниз
   */
  siftDown(index) {
    const left = 2 * index;
    const right = 2 * index + 1;

    let maxIndex = index;

    if (
      left < this.elements.length &&
      this.elements[left].compare(this.elements[maxIndex])
    ) {
      maxIndex = left;
    }

    if (
      right < this.elements.length &&
      this.elements[right].compare(this.elements[maxIndex])
    ) {
      maxIndex = right;
    }

    if (maxIndex !== index) {
      [this.elements[index], this.elements[maxIndex]] = [
        this.elements[maxIndex],
        this.elements[index],
      ];

      this.siftDown(maxIndex);
    }
  }

  /**
   * Проверяет, пуста ли куча
   * @returns {boolean} Возвращает true, если куча пуста
   */
  isEmpty() {
    return this.elements.length === 1;
  }
}

/**
 * Класс, представляющий граф и реализующий алгоритм построения максимального
 * остовного дерева
 */
class Graph {
  /**
   * Создает граф
   * @param {Edge[][]} adjacencyList Список смежности графа
   */
  constructor(adjacencyList) {
    this.adjacencyList = adjacencyList;
    this.added = new Set();
    this.notAdded = new Set();
    this.edges = new Heap();

    for (let i = 1; i < adjacencyList.length; i++) {
      this.notAdded.add(i);
    }
  }

  /**
   * Добавляет вершину в остовное дерево
   * @param {number} vertex Вершина для добавления
   */
  addVertex(vertex) {
    this.added.add(vertex);
    this.notAdded.delete(vertex);

    for (const edge of this.adjacencyList[vertex]) {
      if (this.notAdded.has(edge.to)) {
        this.edges.add(edge);
      }
    }
  }

  /**
   * Строит максимальное остовное дерево алгоритмом Прима.
   *
   * От минимального остова отличается только направлением сравнения в куче:
   * на каждом шаге берется самое дорогое ребро, ведущее из дерева наружу.
   * Свойство разреза симметрично относительно знака, поэтому жадный выбор
   * остается корректным.
   *
   * Ребро, оба конца которого уже в дереве, отбрасывается: оно замкнуло бы цикл.
   *
   * Время: O(|E|·log|E|). Память: O(|E|).
   *
   * @returns {Edge[]|null} Ребра остова либо null, если граф несвязный.
   */
  findMST() {
    const mst = [];
    const startVertex = 1;

    this.addVertex(startVertex);

    while (this.notAdded.size > 0 && !this.edges.isEmpty()) {
      const edge = this.edges.popMax();

      if (this.notAdded.has(edge.to)) {
        mst.push(edge);
        this.addVertex(edge.to);
      }
    }

    // Остались непосещенные вершины - значит, граф распадается
    // на несколько компонент связности и остова не существует
    return this.notAdded.size > 0 ? null : mst;
  }
}

run(solve);
