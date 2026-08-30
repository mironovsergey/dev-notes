/**
 * B. Перевести список ребер в матрицу смежности
 *
 * https://contest.yandex.ru/contest/25069/problems/B/
 *
 * Алла успешно справилась с предыдущим заданием, и теперь ей дали новое.
 * На этот раз список ребер ориентированного графа надо переводить в матрицу
 * смежности. Конечно же, Алла попросила вас помочь написать программу для
 * этого.
 *
 * Формат ввода
 * В первой строке дано число вершин n (1 ≤ n ≤ 100) и число ребер
 * m (1 ≤ m ≤ n(n-1)). В следующих m строках заданы ребра в виде
 * пар вершин (u,v), если ребро ведет от u к v.
 *
 * Формат вывода
 * Выведите матрицу смежности n на n. На пересечении i-й строки и j-го столбца
 * стоит единица, если есть ребро, ведущее из i в j.
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

  // Создание матрицы смежности
  const adjacencyMatrix = createAdjacencyMatrix(n, edges);

  // Вывод результата
  for (let i = 0; i < n; i++) {
    process.stdout.write(`${adjacencyMatrix[i].join(' ')}\n`);
  }
}

/**
 * Создает матрицу смежности ориентированного графа.
 *
 * Вершины во входных данных нумеруются с единицы, а матрица индексируется
 * с нуля, отсюда смещение на единицу при записи.
 *
 * Время: O(|V|² + |E|). Память: O(|V|²).
 *
 * @param {number} n Число вершин графа.
 * @param {Array<[number, number]>} edges Ребра в виде пар [u, v].
 * @returns {number[][]} Матрица смежности размера n × n.
 */
function createAdjacencyMatrix(n, edges) {
  // Инициализируем матрицу смежности размером n x n, заполненную нулями
  const adjacencyMatrix = Array.from({ length: n }, () => Array(n).fill(0));

  // Обрабатываем каждое ребро (u, v)
  edges.forEach(([u, v]) => {
    adjacencyMatrix[u - 1][v - 1] = 1;
  });

  return adjacencyMatrix;
}

run(solve);
