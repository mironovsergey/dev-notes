/**
 * K. Сравнить две строки
 *
 * https://contest.yandex.ru/contest/26131/problems/K/
 *
 * Алла придумала новый способ сравнивать две строки: чтобы сравнить строки
 * a и b, в них надо оставить только те буквы, которые в английском алфавите
 * стоят на четных позициях. Затем полученные строки сравниваются по обычным
 * правилам. Помогите Алле реализовать новое сравнение строк.
 *
 * Формат ввода
 * На вход подаются строки a и b по одной в строке. Обе строки состоят
 * из маленьких латинских букв, не бывают пустыми и не превосходят 10^5
 * символов в длину.
 *
 * Формат вывода
 * Выведите -1, если a < b, 0, если a = b, и 1, если a > b.
 */

const { run, readLine } = require('../../lib/io');

function solve() {
  const s1 = readLine();
  const s2 = readLine();

  process.stdout.write(`${compare(s1, s2)}`);
}

function isEven(char) {
  const evenLetters = [
    'b',
    'd',
    'f',
    'h',
    'j',
    'l',
    'n',
    'p',
    'r',
    't',
    'v',
    'x',
    'z',
  ];

  for (let i = 0; i < evenLetters.length; i++) {
    if (char === evenLetters[i]) {
      return true;
    }
  }

  return false;
}

function filter(str) {
  const filtered = [];

  for (let i = 0; i < str.length; i++) {
    if (isEven(str[i])) {
      filtered.push(str[i]);
    }
  }

  return filtered.join('');
}

function compare(a, b) {
  const filteredA = filter(a);
  const filteredB = filter(b);

  if (filteredA < filteredB) {
    return -1;
  } else if (filteredA > filteredB) {
    return 1;
  } else {
    return 0;
  }
}

run(solve);
