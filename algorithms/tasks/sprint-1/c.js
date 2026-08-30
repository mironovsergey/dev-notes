/**
 * C. Соседи
 *
 * https://github.com/Yandex-Practicum/algorithms-templates/blob/main/js/sprint1_nonfinals/c.js
 * https://contest.yandex.ru/contest/22449/problems/C/
 *
 * Дана матрица. Нужно написать функцию, которая для элемента возвращает всех
 * его соседей. Соседним считается элемент,находящийся от текущего на одну
 * ячейку влево, вправо, вверх или вниз. Диагональные элементы соседними
 * не считаются.
 *
 * Формат ввода
 * В первой строке задано n - количество строк матрицы. Во второй - количество
 * столбцов m. Числа m и n не превосходят 1000. В следующих n строках задана
 * матрица. Элементы матрицы - целые числа, по модулю не превосходящие 1000.
 * В последних двух строках записаны координаты элемента, соседей которого нужно
 * найти. Индексация начинается с нуля.
 *
 * Формат вывода
 * Напечатайте нужные числа в возрастающем порядке через пробел.
 */

const { run, readInt, readMatrix } = require('../../lib/io');

/**
 * Возвращает значения соседних по стороне элементов матрицы,
 * отсортированные по возрастанию.
 *
 * Диагональные элементы соседними не считаются, поэтому кандидатов не более
 * четырех, и сортировка выполняется за константное время.
 *
 * Время: O(1). Память: O(1).
 *
 * @param {number[][]} matrix Исходная матрица.
 * @param {number} row Индекс строки элемента.
 * @param {number} col Индекс столбца элемента.
 * @returns {number[]} Значения соседей в возрастающем порядке.
 */
function getNeighbours(matrix, row, col) {
  const neighbours = [];

  if (row > 0) {
    neighbours.push(matrix[row - 1][col]);
  }

  if (row < matrix.length - 1) {
    neighbours.push(matrix[row + 1][col]);
  }

  if (col > 0) {
    neighbours.push(matrix[row][col - 1]);
  }

  if (col < matrix[0].length - 1) {
    neighbours.push(matrix[row][col + 1]);
  }

  neighbours.sort((a, b) => a - b);

  return neighbours;
}

function solve() {
  const rows = readInt();
  const cols = readInt();
  const matrix = readMatrix(rows);
  const rowId = readInt();
  const colId = readInt();

  process.stdout.write(`${getNeighbours(matrix, rowId, colId).join(' ')}`);
}

run(solve);
