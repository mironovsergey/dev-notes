/**
 * Считывание пары чисел, которые записаны в одной строке.
 */

const { run, readArray } = require('../../lib/io');

function solve() {
  const [a, b] = readArray();

  const answer = a + b;

  console.log(answer);
}

run(solve);
