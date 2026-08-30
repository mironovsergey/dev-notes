/**
 * Чтение стандартного ввода для задач Яндекс Практикума.
 *
 * Задачи используют построчный формат ввода: весь поток вычитывается в память,
 * после чего решение забирает строки по одной. Модуль хранит позицию чтения,
 * поэтому читающие функции вызываются последовательно, в порядке следования
 * строк во вводе.
 *
 * Типовое использование:
 *
 *   const { run, readInt, readArray } = require('../../lib/io');
 *
 *   function solve() {
 *     const n = readInt();
 *     const numbers = readArray();
 *     process.stdout.write(`${n + numbers.length}`);
 *   }
 *
 *   run(solve);
 */

const readline = require('readline');

const inputLines = [];
let currentLine = 0;

/**
 * Вычитывает стандартный ввод и вызывает решение после его завершения.
 *
 * @param {() => void} solve Функция решения задачи.
 * @returns {void}
 */
function run(solve) {
  const reader = readline.createInterface({ input: process.stdin });

  reader.on('line', (line) => {
    inputLines.push(line);
  });

  process.stdin.on('end', solve);
}

/**
 * Возвращает очередную строку ввода и сдвигает позицию чтения.
 *
 * @returns {string|undefined} Строка либо undefined, если ввод исчерпан.
 */
function readLine() {
  return inputLines[currentLine++];
}

/**
 * Читает очередную строку и возвращает записанное в ней число.
 *
 * @returns {number} Прочитанное число.
 */
function readInt() {
  return Number(readLine());
}

/**
 * Читает очередную строку и возвращает записанные в ней числа.
 *
 * Разделителем считается любая последовательность пробельных символов, поэтому
 * повторяющиеся пробелы и отступы по краям строки не порождают NaN. Пустая
 * строка дает пустой массив.
 *
 * @returns {number[]} Числа из строки в порядке следования.
 */
function readArray() {
  const line = (readLine() || '').trim();

  if (line === '') {
    return [];
  }

  return line.split(/\s+/).map(Number);
}

/**
 * Читает заданное количество строк и возвращает их как матрицу чисел.
 *
 * @param {number} rowsCount Количество строк матрицы.
 * @returns {number[][]} Матрица: массив строк, каждая - массив чисел.
 */
function readMatrix(rowsCount) {
  const matrix = [];

  for (let i = 0; i < rowsCount; i++) {
    matrix.push(readArray());
  }

  return matrix;
}

module.exports = { run, readLine, readInt, readArray, readMatrix };
