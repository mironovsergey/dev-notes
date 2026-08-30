/**
 * F. Расстояние между вершинами
 *
 * https://contest.yandex.ru/contest/25069/problems/F/
 *
 * Найдите кратчайшее расстояние между парой вершин в неориентированном графе.
 * Граф может быть несвязным.
 *
 * Формат ввода
 * В первой строке дано количество вершин n (1 ≤ n ≤ 10^5) и ребер
 * m (1 ≤ m ≤ 10^5). Далее в m строках описаны ребра графа. Каждое ребро
 * описывается номерами двух вершин u и v (1 ≤ u, v ≤ n). В последней строке дан
 * номер стартовой вершины s (1 ≤ s ≤ n) и конечной t (1 ≤ t ≤ n).
 * Гарантируется, что в графе нет петель и кратных ребер.
 *
 * Формат вывода
 * Выведите длину кратчайшего пути (в ребрах) между заданной парой вершин.
 * Если пути не существует, то выведите -1.
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

  // Чтение гомера стартовой вершины (s) и конечной (t)
  const [s, t] = readLine()
    .trim()
    .split(' ')
    .map((val) => parseInt(val, 10));

  // Создание списка смежности
  const adjacencyList = createAdjacencyList(n, edges);

  // Поиск кратчайшего расстояния между парой вершин в неориентированном графе
  const shortestPath = findShortestPath(n, s, t, adjacencyList);

  // Вывод результата
  process.stdout.write(`${shortestPath}`);
}

function createAdjacencyList(n, edges) {
  const adjacencyList = Array.from({ length: n + 1 }, () => []);

  for (const [u, v] of edges) {
    adjacencyList[u].push(v);
    adjacencyList[v].push(u);
  }

  return adjacencyList;
}

// Функция для поиска кратчайшего пути с помощью BFS
/**
 * Возвращает длину кратчайшего пути между двумя вершинами.
 *
 * Граф невзвешенный, поэтому кратчайший путь дает обход в ширину: вершины
 * обнаруживаются в порядке возрастания расстояния, и первое же обнаружение
 * конечной вершины является кратчайшим - обход можно прекратить сразу.
 *
 * Очередь реализована массивом с указателем на голову: shift сдвигал бы все
 * оставшиеся элементы.
 *
 * Время: O(|V| + |E|). Память: O(|V|).
 *
 * @param {number} n Количество вершин.
 * @param {number} startVertex Начальная вершина.
 * @param {number} endVertex Конечная вершина.
 * @param {number[][]} adjacencyList Списки смежности.
 * @returns {number} Длина кратчайшего пути либо -1, если пути нет.
 */
function findShortestPath(n, startVertex, endVertex, adjacencyList) {
  if (startVertex === endVertex) {
    return 0;
  }

  const distances = Array(n + 1).fill(-1);
  const previous = Array(n + 1).fill(null);
  const queue = [startVertex];
  let head = 0;

  distances[startVertex] = 0;

  while (head < queue.length) {
    const currentVertex = queue[head];
    head++;

    for (const neighbor of adjacencyList[currentVertex]) {
      // Если вершина еще не посещена
      if (distances[neighbor] === -1) {
        distances[neighbor] = distances[currentVertex] + 1;
        previous[neighbor] = currentVertex;

        queue.push(neighbor);

        if (neighbor === endVertex) {
          return distances[neighbor];
        }
      }
    }
  }

  return -1;
}

// Вспомогательная функция для восстановления пути
function shortestPath(previous, endVertex) {
  const path = [];

  let currentVertex = endVertex;

  while (currentVertex !== null) {
    path.push(currentVertex);
    currentVertex = previous[currentVertex];
  }

  return path;
}

run(solve);
