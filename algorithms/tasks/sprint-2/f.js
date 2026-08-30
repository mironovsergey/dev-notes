/**
 * F. Стек - Max
 *
 * https://contest.yandex.ru/contest/22779/problems/F/
 *
 * Нужно реализовать класс StackMax, который поддерживает операцию определения
 * максимума среди всех элементов в стеке. Класс должен поддерживать операции
 * push(x), где x – целое число, pop() и get_max().
 *
 * Формат ввода
 * В первой строке записано одно число n - количество команд, которое
 * не превосходит 10000. В следующих n строках идут команды. Команды могут быть
 * следующих видов:
 * - push(x) - добавить число x в стек. Число x не превышает 10^5;
 * - pop() - удалить число с вершины стека;
 * - get_max() - напечатать максимальное число в стеке;
 * Если стек пуст, при вызове команды get_max() нужно напечатать «None»,
 * для команды pop() - «error».
 *
 * Формат вывода
 * Для каждой команды get_max() напечатайте результат ее выполнения. Если стек
 * пустой, для команды get_max() напечатайте «None». Если происходит удаление
 * из пустого стека - напечатайте «error».
 */

const { run, readInt, readLine } = require('../../lib/io');

/**
 * Стек с получением максимума за O(1).
 *
 * Рядом с основным стеком поддерживается стек максимумов: на позиции i в нем
 * лежит максимум среди первых i + 1 элементов основного стека. Оба стека
 * изменяются синхронно, поэтому вершина стека максимумов всегда отвечает
 * текущему содержимому.
 *
 * Прямой пересчет максимума перебором элементов стоил бы O(n) на запрос и
 * превращал бы серию из n команд в O(n²).
 */
class StackMax {
  constructor() {
    this.items = [];
    this.maxima = [];
  }

  /**
   * Кладет число на вершину стека.
   *
   * Время: O(1) амортизированно.
   *
   * @param {number} value Добавляемое число.
   * @returns {void}
   */
  push(value) {
    const previousMax = this.maxima[this.maxima.length - 1];

    this.items.push(value);
    this.maxima.push(
      this.maxima.length === 0 ? value : Math.max(value, previousMax),
    );
  }

  /**
   * Снимает число с вершины стека.
   *
   * Время: O(1).
   *
   * @returns {number|undefined} Снятое число либо undefined, если стек пуст.
   */
  pop() {
    this.maxima.pop();

    return this.items.pop();
  }

  /**
   * Возвращает максимум среди элементов стека.
   *
   * Время: O(1).
   *
   * @returns {number|null} Максимум либо null, если стек пуст.
   */
  getMax() {
    if (this.maxima.length === 0) {
      return null;
    }

    return this.maxima[this.maxima.length - 1];
  }
}

function solve() {
  const stack = new StackMax();
  const n = readInt();
  const output = [];

  for (let i = 0; i < n; i++) {
    const [command, argument] = readLine().trim().split(/\s+/);

    switch (command) {
      case 'push':
        stack.push(Number(argument));
        break;
      case 'pop':
        if (typeof stack.pop() === 'undefined') {
          output.push('error');
        }
        break;
      case 'get_max': {
        const max = stack.getMax();

        output.push(max === null ? 'None' : `${max}`);
        break;
      }
    }
  }

  process.stdout.write(output.length === 0 ? '' : `${output.join('\n')}\n`);
}

run(solve);
