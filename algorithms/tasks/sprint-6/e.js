/**
 * E. Компоненты связности
 *
 * https://contest.yandex.ru/contest/25069/problems/E/
 *
 * Вам дан неориентированный граф. Найдите его компоненты связности.
 *
 * Формат ввода
 * В первой строке дано количество вершин n (1≤ n ≤ 10^5) и ребер
 * m (0 ≤ m ≤ 2 * 10^5). В каждой из следующих m строк записано по ребру в виде
 * пары вершин 1 ≤ u, v ≤ n.
 *
 * Гарантируется, что в графе нет петель и кратных ребер.
 *
 * Формат вывода
 * Выведите все компоненты связности в следующем формате: в первой строке
 * выведите общее количество компонент.
 *
 * Затем на отдельных строках выведите вершины каждой компоненты,
 * отсортированные по возрастанию номеров. Компоненты между собой
 * упорядочивайте по номеру первой вершины.
 */

const { run, readLine } = require('../../lib/io');

function solve() {
  // Чтение числа вершин (n) и числа ребер (m)
  const [n, m] = readLine()
    .trim()
    .split(' ')
    .map((val) => parseInt(val, 10));

  // Массив ребер графа
  const edges = [];

  // Чтение всех ребер
  for (let i = 1; i <= m; i++) {
    edges.push(
      readLine()
        .trim()
        .split(' ')
        .map((val) => parseInt(val, 10)),
    );
  }

  // Создание списка смежности
  const adjacencyList = createAdjacencyList(n, edges);

  // Поиск компонент связности
  const components = findConnectedComponents(n, adjacencyList);

  // Вывод результата
  process.stdout.write(`${components.length}\n`);

  for (const component of components) {
    process.stdout.write(`${component.join(' ')}\n`);
  }
}

function createAdjacencyList(n, edges) {
  const adjacencyList = Array.from({ length: n + 1 }, () => []);

  for (const [u, v] of edges) {
    adjacencyList[u].push(v);
    adjacencyList[v].push(u);
  }

  return adjacencyList;
}

/**
 * Выполняет обход графа в глубину (DFS) рекурсивно
 * Имеет проблему с переполнением стека вызовов
 *
 * @param {number} startVertex - Начальная вершина для обхода
 * @param {number[][]} adjacencyList - Список смежности графа, где индекс
 * представляет вершину, а значение по индексу - массив соседних вершин
 * @param {boolean[]} visited - Массив, указывающий, была ли вершина посещена
 * @param {number[]} component - Массив, собирающий вершины текущей компоненты
 * связности
 */
function dfsRecursive(startVertex, adjacencyList, visited, component) {
  visited[startVertex] = true;

  component.push(startVertex);

  for (const neighbor of adjacencyList[startVertex]) {
    if (!visited[neighbor]) {
      dfsRecursive(neighbor, adjacencyList, visited, component);
    }
  }
}

/**
 * Выполняет обход графа в глубину (DFS) итеративно
 *
 * @param {number} startVertex - Начальная вершина для обхода
 * @param {number[][]} adjacencyList - Список смежности графа, где индекс
 * представляет вершину, а значение по индексу - массив соседних вершин
 * @param {boolean[]} visited - Массив, указывающий, была ли вершина посещена
 * @param {number[]} component - Массив, собирающий вершины текущей компоненты
 * связности
 */
function dfsIterative(startVertex, adjacencyList, visited, component) {
  const stack = [startVertex];

  while (stack.length > 0) {
    const currentVertex = stack.pop();

    if (!visited[currentVertex]) {
      visited[currentVertex] = true;

      component.push(currentVertex);

      for (const neighbor of adjacencyList[currentVertex]) {
        if (!visited[neighbor]) {
          stack.push(neighbor);
        }
      }
    }
  }
}

/**
 * Разбивает неориентированный граф на компоненты связности.
 *
 * Обход из вершины посещает ровно ее компоненту, потому что достижимость
 * в неориентированном графе симметрична. Для ориентированного графа этот
 * подход неприменим.
 *
 * Время: O(|V| + |E|) суммарно по всем запускам обхода: каждая вершина
 * и каждое ребро обрабатываются один раз. Память: O(|V|).
 *
 * @param {number} n Количество вершин.
 * @param {number[][]} adjacencyList Списки смежности.
 * @returns {number[][]} Компоненты связности, каждая отсортирована
 *   по возрастанию номеров вершин.
 */
function findConnectedComponents(n, adjacencyList) {
  const visited = new Array(n + 1).fill(false);
  const components = [];

  for (let i = 1; i <= n; i++) {
    if (!visited[i]) {
      const component = [];

      dfsIterative(i, adjacencyList, visited, component);

      component.sort((a, b) => a - b);
      components.push(component);
    }
  }

  components.sort((a, b) => a[0] - b[0]);

  return components;
}

run(solve);
