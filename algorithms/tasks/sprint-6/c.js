/**
 * C. DFS
 *
 * https://contest.yandex.ru/contest/25069/problems/C/
 *
 * Задан неориентированный граф. Обойдите с помощью DFS все вершины, достижимые
 * из заданной вершины s, и выведите их в порядке обхода, если начинать обход
 * из s.
 *
 * Формат ввода
 * В первой строке дано количество вершин n (1 ≤ n ≤ 10^5) и ребер
 * m (0 ≤ m ≤ 10^5). Далее в m строках описаны ребра графа. Каждое ребро
 * описывается номерами двух вершин u и v (1 ≤ u, v ≤ n). В последней строке дан
 * номер стартовой вершины s (1 ≤ s ≤ n). В графе нет петель и кратных ребер.
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

  dfs(s, adjacencyList, vertexColors, traversalOrder);

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
 * Обходит граф в глубину без рекурсии, записывая порядок посещения.
 *
 * Итеративная версия обязательна: по условию n достигает 10^5, а глубина
 * рекурсии на графе-цепочке равна числу вершин и переполнила бы стек вызовов.
 *
 * Каждая вершина попадает в стек дважды - перед обработкой соседей и повторно,
 * чтобы на обратном пути ее можно было закрыть. Соседи добавляются в обратном
 * порядке, потому что стек отдает последний добавленный: так обход идет по
 * возрастанию номеров, как требует условие.
 *
 * Время: O(|V| + |E|). Память: O(|V| + |E|) на стек.
 *
 * @param {number} startVertex Стартовая вершина.
 * @param {number[][]} adjacencyList Списки смежности.
 * @param {string[]} vertexColors Цвета вершин; изменяется на месте.
 * @param {number[]} traversalOrder Порядок обхода; заполняется на месте.
 * @returns {void}
 */
function dfs(startVertex, adjacencyList, vertexColors, traversalOrder) {
  let stack = [];

  // Добавляем начальную вершину в стек
  stack.push(startVertex);

  while (stack.length > 0) {
    // Получаем из стека текущую вершину
    const currentVertex = stack.pop();

    // Если вершина белая, значит она не была посещена
    if (vertexColors[currentVertex] === 'white') {
      // Помечаем вершину как серую
      vertexColors[currentVertex] = 'gray';

      // Запоминаем вершину в порядке обхода
      traversalOrder.push(currentVertex);

      // Добавляем вершину обратно в стек для обработки на обратном пути
      stack.push(currentVertex);

      // Добавляем в стек всех непосещенных соседей текущей вершины
      // в обратном порядке
      for (let i = adjacencyList[currentVertex].length - 1; i >= 0; i--) {
        const neighbor = adjacencyList[currentVertex][i];

        if (vertexColors[neighbor] === 'white') {
          stack.push(neighbor);
        }
      }
    }
    // Если вершина серая, значит мы возвращаемся к ней
    // после обработки всех ее соседей
    else if (vertexColors[currentVertex] === 'gray') {
      // Помечаем вершину как черную
      vertexColors[currentVertex] = 'black';
    }
  }
}

run(solve);
