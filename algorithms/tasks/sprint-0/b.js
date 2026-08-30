/**
 * B. Застежка-молния
 *
 * https://github.com/Yandex-Practicum/algorithms-templates/blob/main/js/sprint0/b.js
 * https://contest.yandex.ru/contest/26365/problems/B/
 *
 * Даны два массива чисел длины n. Составьте из них один массив длины 2n,
 * в котором числа из входных массивов чередуются (первый - второй - первый -
 * второй - ...). При этом относительный порядок следования чисел из одного
 * массива должен быть сохранен.
 *
 * Формат ввода
 * В первой строке записано целое число n - длина каждого из массивов,
 * 1 ≤ n ≤ 1000. Во второй строке записано n чисел из первого массива, через
 * пробел. В третьей строке –- n чисел из второго массива. Значения всех
 * чисел - натуральные и не превосходят 1000.
 *
 * Формат вывода
 * Выведите 2n чисел из объединенного массива через пробел.
 */

const { run, readInt, readArray } = require('../../lib/io');

function zip(a, b) {
  if (a.length !== b.length) {
    throw new Error('Массивы должны быть одинаковой длины');
  }

  const result = [];

  for (let i = 0; i < a.length; i++) {
    result.push(a[i], b[i]);
  }

  return result;
}

function solve() {
  const n = readInt();
  const a = readArray();
  const b = readArray();
  process.stdout.write(`${zip(a, b).join(' ')}`);
}

run(solve);
