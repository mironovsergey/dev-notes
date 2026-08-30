/**
 * D. BFS
 *
 * https://contest.yandex.ru/contest/25069/problems/D/
 *
 * Задан неориентированный граф. Обойдите поиском в ширину все вершины,
 * достижимые из заданной вершины s, и выведите их в порядке обхода, если
 * начинать обход из s.
 *
 * Формат ввода
 * В первой строке дано количество вершин n (1 ≤ n ≤ 10^5) и ребер
 * m (0 ≤ m ≤ 10^5). Далее в m строках описаны ребра графа. Каждое ребро
 * описывается номерами двух вершин u и v (1 ≤ u, v ≤ n). В последней строке дан
 * номер стартовой вершины s (1 ≤ s ≤ n).
 *
 * Гарантируется, что в графе нет петель и кратных ребер.
 *
 * Формат вывода
 * Выведите вершины в порядке обхода, считая что при запуске от каждой
 * конкретной вершины ее соседи будут рассматриваться в порядке возрастания
 * (то есть если вершина 2 соединена с 1 и 3, то сначала обход пойдет в 1,
 * а уже потом в 3).
 */

const { run, readInt, readLine } = require('../../lib/io');

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

  // Чтение номера стартовой вершины
  const s = readInt();

  // Создание списка смежности
  const adjacencyList = createAdjacencyList(n, edges);

  // Массив для хранения цветов вершин
  const vertexColors = Array(n + 1).fill('white');

  // Массив вершин в порядке обхода
  const traversalOrder = [];

  bfs(s, adjacencyList, vertexColors, traversalOrder);

  process.stdout.write(`${traversalOrder.join(' ')}\n`);
}

function createAdjacencyList(n, edges) {
  const adjacencyList = Array.from({ length: n + 1 }, () => []);

  edges.forEach(([u, v]) => {
    adjacencyList[u].push(v);
    adjacencyList[v].push(u);
  });

  // Сортируем списки смежности для каждой вершины
  adjacencyList.forEach((neighbors) => neighbors.sort((a, b) => a - b));

  return adjacencyList;
}

/**
 * Обходит граф в ширину, записывая порядок посещения вершин.
 *
 * Очередь реализована массивом с указателем на голову. Метод shift сдвигает
 * все оставшиеся элементы, и на графе-звезде, где очередь сразу вырастает до
 * n элементов, обход из-за этого замедляется в несколько раз.
 *
 * Вершина красится в серый при добавлении в очередь, а не при извлечении:
 * иначе она попала бы в очередь столько раз, сколько в нее входит ребер.
 *
 * Время: O(|V| + |E|). Память: O(|V|).
 *
 * @param {number} startVertex Стартовая вершина.
 * @param {number[][]} adjacencyList Списки смежности.
 * @param {string[]} vertexColors Цвета вершин; изменяется на месте.
 * @param {number[]} traversalOrder Порядок обхода; заполняется на месте.
 * @returns {void}
 */
function bfs(startVertex, adjacencyList, vertexColors, traversalOrder) {
  const queue = [startVertex];
  let head = 0;

  // Красим начальную вершину в серый цвет
  vertexColors[startVertex] = 'gray';

  while (head < queue.length) {
    // Извлекаем вершину из очереди
    const currentVertex = queue[head];
    head++;

    // Красим вершину в черный цвет
    vertexColors[currentVertex] = 'black';

    // Запоминаем вершину в порядке обхода
    traversalOrder.push(currentVertex);

    // Обрабатываем всех соседей текущей вершины
    for (let neighbor of adjacencyList[currentVertex]) {
      if (vertexColors[neighbor] === 'white') {
        // Красим соседа в серый цвет
        vertexColors[neighbor] = 'gray';

        // Добавляем соседа в очередь
        queue.push(neighbor);
      }
    }
  }
}

run(solve);
