/**
 * A. Дек
 *
 * https://contest.yandex.ru/contest/22781/problems/A/
 *
 * Гоша реализовал структуру данных Дек, максимальный размер которого
 * определяется заданным числом. Методы push_back(x), push_front(x), pop_back(),
 * pop_front() работали корректно. Но, если в деке было много элементов,
 * программа работала очень долго. Дело в том, что не все операции выполнялись
 * за O(1). Помогите Гоше! Напишите эффективную реализацию.
 *
 * Внимание: при реализации используйте кольцевой буфер.
 *
 * Формат ввода
 * В первой строке записано количество команд n - целое число, не превосходящее
 * 100000. Во второй строке записано число m - максимальный размер дека. Он не
 * превосходит 50000. В следующих n строках записана одна из команд:
 * - push_back(value) – добавить элемент в конец дека. Если в деке уже находится
 *   максимальное число элементов, вывести «error».
 * - push_front(value) – добавить элемент в начало дека. Если в деке уже
 *   находится максимальное число элементов, вывести «error».
 * - pop_front() – вывести первый элемент дека и удалить его. Если дек был пуст,
 *   то вывести «error».
 * - pop_back() – вывести последний элемент дека и удалить его. Если дек был
 *   пуст, то вывести «error».
 * Value - целое число, по модулю не превосходящее 1000.
 *
 * Формат вывода
 * Выведите результат выполнения каждой команды на отдельной строке. Для
 * успешных запросов push_back(x) и push_front(x) ничего выводить не надо.
 *
 * Отчет: https://contest.yandex.ru/contest/22781/run-report/107164526/
 */

const { run, readInt, readLine } = require('../../lib/io');

const ERROR = 'error';

/**
 * Дек фиксированной емкости на кольцевом буфере.
 *
 * Буфер считается замкнутым в кольцо: индекс, вышедший за границу, переходит
 * на противоположный конец через взятие остатка по модулю емкости. Благодаря
 * этому освободившиеся ячейки переиспользуются и ни одна операция не требует
 * сдвига элементов - все четыре выполняются за O(1).
 *
 * Длина хранится отдельным полем: только по head и tail состояния «дек пуст»
 * и «дек полон» неразличимы, в обоих head === tail.
 */
class Deque {
  /**
   * @param {number} capacity Максимальное количество элементов.
   */
  constructor(capacity) {
    this.buffer = new Array(capacity).fill(null);
    this.capacity = capacity;
    // Индекс первого элемента
    this.head = 0;
    // Индекс первой свободной ячейки за последним элементом
    this.tail = 0;
    this.length = 0;
  }

  /**
   * Проверяет, пуст ли дек.
   *
   * Время: O(1).
   *
   * @returns {boolean} true, если дек пуст.
   */
  isEmpty() {
    return this.length === 0;
  }

  /**
   * Проверяет, заполнен ли дек.
   *
   * Время: O(1).
   *
   * @returns {boolean} true, если свободных ячеек не осталось.
   */
  isFull() {
    return this.length === this.capacity;
  }

  /**
   * Добавляет элемент в конец дека.
   *
   * Время: O(1).
   *
   * @param {number} value Добавляемое значение.
   * @returns {void}
   */
  pushBack(value) {
    this.buffer[this.tail] = value;
    this.tail = (this.tail + 1) % this.capacity;
    this.length++;
  }

  /**
   * Добавляет элемент в начало дека.
   *
   * Слагаемое capacity в вычислении индекса обязательно: в JavaScript остаток
   * от деления отрицательного числа отрицателен, и (0 - 1) % capacity дало бы
   * -1 вместо индекса последней ячейки.
   *
   * Время: O(1).
   *
   * @param {number} value Добавляемое значение.
   * @returns {void}
   */
  pushFront(value) {
    this.head = (this.head - 1 + this.capacity) % this.capacity;
    this.buffer[this.head] = value;
    this.length++;
  }

  /**
   * Извлекает элемент с конца дека.
   *
   * Время: O(1).
   *
   * @returns {number} Извлеченное значение.
   */
  popBack() {
    // tail указывает на свободную ячейку, поэтому сначала шаг назад
    this.tail = (this.tail - 1 + this.capacity) % this.capacity;

    const value = this.buffer[this.tail];

    this.buffer[this.tail] = null;
    this.length--;

    return value;
  }

  /**
   * Извлекает элемент из начала дека.
   *
   * Время: O(1).
   *
   * @returns {number} Извлеченное значение.
   */
  popFront() {
    const value = this.buffer[this.head];

    this.buffer[this.head] = null;
    this.head = (this.head + 1) % this.capacity;
    this.length--;

    return value;
  }
}

function solve() {
  const commandsCount = readInt();
  const capacity = readInt();
  const deque = new Deque(capacity);
  const output = [];

  for (let i = 0; i < commandsCount; i++) {
    const [command, argument] = readLine().trim().split(/\s+/);

    switch (command) {
      case 'push_back':
        if (deque.isFull()) {
          output.push(ERROR);
        } else {
          deque.pushBack(Number(argument));
        }
        break;
      case 'push_front':
        if (deque.isFull()) {
          output.push(ERROR);
        } else {
          deque.pushFront(Number(argument));
        }
        break;
      case 'pop_back':
        output.push(deque.isEmpty() ? ERROR : `${deque.popBack()}`);
        break;
      case 'pop_front':
        output.push(deque.isEmpty() ? ERROR : `${deque.popFront()}`);
        break;
    }
  }

  process.stdout.write(output.length === 0 ? '' : `${output.join('\n')}\n`);
}

run(solve);
