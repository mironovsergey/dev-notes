/**
 * A. Значения функции
 *
 * https://github.com/Yandex-Practicum/algorithms-templates/blob/main/js/sprint1_nonfinals/a.js
 * https://contest.yandex.ru/contest/22449/problems/A/
 *
 * Вася делает тест по математике: вычисляет значение функций в различных
 * точках. Стоит отличная погода, и друзья зовут Васю гулять. Но мальчик решил
 * сначала закончить тест и только после этого идти к друзьям. К сожалению, Вася
 * пока не умеет программировать. Зато вы умеете. Помогите Васе написать код
 * функции, вычисляющей y = ax^2 + bx + c. Напишите программу, которая будет по
 * коэффициентам a, b, c и числу x выводить значение функции в точке x.
 *
 * Формат ввода
 * На вход через пробел подаются целые числа a, x, b, c. В конце ввода находится
 * перенос строки.
 *
 * Формат вывода
 * Выведите одно число - значение функции в точке x.
 */

const { run, readArray } = require('../../lib/io');

/**
 * Вычисляет значение квадратичной функции y = ax² + bx + c в точке x.
 *
 * Время: O(1). Память: O(1).
 *
 * @param {number} x Точка, в которой вычисляется значение.
 * @param {number} a Коэффициент при x².
 * @param {number} b Коэффициент при x.
 * @param {number} c Свободный член.
 * @returns {number} Значение функции в точке x.
 */
function evaluateFunction(x, a, b, c) {
  return a * x ** 2 + b * x + c;
}

function solve() {
  const inputNumbers = readArray();
  const a = inputNumbers[0];
  const x = inputNumbers[1];
  const b = inputNumbers[2];
  const c = inputNumbers[3];
  process.stdout.write(`${evaluateFunction(x, a, b, c)}`);
}

run(solve);
