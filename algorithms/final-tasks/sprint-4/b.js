/**
 * B. Хеш-таблица
 *
 * https://contest.yandex.ru/contest/24414/problems/B/
 *
 * Тимофей, как хороший руководитель, хранит информацию о зарплатах своих
 * сотрудников в базе данных и постоянно ее обновляет. Он поручил вам написать
 * реализацию хеш-таблицы, чтобы хранить в ней базу данных с зарплатами
 * сотрудников.
 *
 * Хеш-таблица должна поддерживать следующие операции:
 * - put key value - добавление пары ключ-значение. Если заданный ключ уже есть
 *   в таблице, то соответствующее ему значение обновляется.
 * - get key - получение значения по ключу. Если ключа нет в таблице, то
 *   вывести «None». Иначе вывести найденное значение.
 * - delete key - удаление ключа из таблицы. Если такого ключа нет, то вывести
 *   «None», иначе вывести хранимое по данному ключу значение и удалить ключ.
 *
 * В таблице хранятся уникальные ключи.
 *
 * Требования к реализации:
 * - Нельзя использовать имеющиеся в языках программирования реализации
 *   хеш-таблиц.
 * - Разрешать коллизии следует с помощью метода цепочек или с помощью открытой
 *   адресации.
 * - Все операции должны выполняться за O(1) в среднем.
 * - Поддерживать рехеширование и масштабирование хеш-таблицы не требуется.
 * - Ключи и значения, id сотрудников и их зарплата, - целые числа.
 *   Поддерживать произвольные хешируемые типы не требуется.
 *
 * Формат ввода
 * В первой строке задано общее число запросов к таблице n (1≤ n≤ 10^6).
 *
 * В следующих n строках записаны запросы, которые бывают трех видов - get, put,
 * delete - как описано в условии.
 *
 * Все ключи и значения - целые числа, не превосходящие 10^9 по модулю. Числа
 * могут быть и отрицательными в том числе.
 *
 * При любой последовательности команд, количество ключей в хеш-таблице не может
 * превышать 10^5.
 *
 * Формат вывода
 * На каждый запрос вида get и delete выведите ответ на него в отдельной строке.
 *
 * Отчет: https://contest.yandex.ru/contest/24414/run-report/109808680/
 */

const { run, readInt, readLine } = require('../../lib/io');

function solve() {
  const n = readInt(); // число запросов к таблице
  const hashTable = new HashTable(n);

  // Накопление в массив вместо конкатенации строки: при n до 10^6
  // приписывание к строке в цикле каждый раз создает новую строку
  const output = [];

  for (let i = 0; i < n; i++) {
    const [command, key, value] = readLine().trim().split(/\s+/);

    switch (command) {
      case 'put':
        hashTable.put(Number(key), Number(value));
        break;
      case 'get':
        output.push(formatResult(hashTable.get(Number(key))));
        break;
      case 'delete':
        output.push(formatResult(hashTable.delete(Number(key))));
        break;
    }
  }

  process.stdout.write(output.length === 0 ? '' : `${output.join('\n')}\n`);
}

/**
 * Приводит результат операции к строке вывода.
 *
 * @param {number|null} result Значение либо null, если ключ отсутствует.
 * @returns {string} Значение или «None».
 */
function formatResult(result) {
  return result !== null ? `${result}` : 'None';
}

// =============================================================================
/**
 * Узел хеш-таблицы
 */
class Node {
  /**
   * Создает узел
   * @param {any} key Ключ узла
   * @param {any} value Значение узла
   * @param {Node} next Ссылка на следующий узел
   */
  constructor(key, value, next = null) {
    this.key = key;
    this.value = value;
    this.next = next;
  }
}

/**
 * Хеш-таблица с использованием цепочек
 */
class HashTable {
  /**
   * Создает хеш-таблицу, округляя запрошенный размер вверх до простого числа.
   *
   * Простой размер обязателен для метода деления: у составного модуля ключи с
   * общим с ним делителем занимают лишь часть корзин. Рехеширование условием
   * не требуется, поэтому число корзин выбирается сразу с запасом.
   *
   * Время: O(√size) на поиск простого числа. Память: O(size).
   *
   * @param {number} size Желаемое минимальное число корзин.
   */
  constructor(size) {
    this.size = this.getPrime(size);
    this.items = new Array(this.size);
  }

  /**
   * Возвращает номер корзины для целочисленного ключа методом деления.
   *
   * Ключи по условию могут быть отрицательными, а оператор % в JavaScript
   * возвращает остаток со знаком делимого, поэтому результат приводится
   * к неотрицательному.
   *
   * Время: O(1).
   *
   * @param {number} key Ключ.
   * @returns {number} Номер корзины в диапазоне [0, size).
   */
  hash(key) {
    const { size } = this;

    return ((key % size) + size) % size;
  }

  /**
   * Находит наименьшее простое число, не меньшее заданного.
   *
   * Время: O(g · √n), где g - расстояние до ближайшего простого.
   *
   * @param {number} n Начальное число.
   * @returns {number} Простое число.
   */
  getPrime(n) {
    while (!this.isPrime(n)) {
      n++;
    }

    return n;
  }

  /**
   * Проверяет, является ли заданное число простым
   * @param {number} n Проверяемое число
   * @returns {boolean} Результат проверки
   */
  isPrime(n) {
    for (let i = 2, sqrt = Math.sqrt(n); i <= sqrt; i++) {
      if (n % i === 0) {
        return false;
      }
    }

    return n > 1;
  }

  /**
   * Записывает значение по ключу, заменяя прежнее.
   *
   * Цепочка просматривается целиком: ключи в таблице уникальны, поэтому
   * убедиться в отсутствии ключа можно только дойдя до ее конца. Новый узел
   * вставляется в голову - это O(1) и порядок внутри корзины не важен.
   *
   * Время: O(1 + α) в среднем, где α - коэффициент заполнения.
   *
   * @param {number} key Ключ.
   * @param {number} value Значение.
   * @returns {void}
   */
  put(key, value) {
    const index = this.hash(key);

    for (let node = this.items[index]; node; node = node.next) {
      if (node.key === key) {
        node.value = value;
        return;
      }
    }

    this.items[index] = new Node(key, value, this.items[index]);
  }

  /**
   * Возвращает значение по ключу.
   *
   * Время: O(1 + α) в среднем.
   *
   * @param {number} key Ключ.
   * @returns {number|null} Значение либо null, если ключа нет.
   */
  get(key) {
    const index = this.hash(key);

    let currItem = this.items[index];

    while (currItem) {
      if (currItem.key === key) {
        return currItem.value;
      }

      currItem = currItem.next;
    }

    return null;
  }

  /**
   * Удаляет ключ из таблицы.
   *
   * Метод цепочек позволяет просто исключить узел из списка. Открытая
   * адресация на этом месте потребовала бы надгробия: пустая ячейка в середине
   * цепочки проб оборвала бы поиск следующих за ней ключей.
   *
   * Время: O(1 + α) в среднем.
   *
   * @param {number} key Ключ.
   * @returns {number|null} Удаленное значение либо null, если ключа нет.
   */
  delete(key) {
    const index = this.hash(key);

    let currItem = this.items[index];
    let prevItem = null;

    while (currItem) {
      if (currItem.key === key) {
        if (prevItem) {
          prevItem.next = currItem.next;
        } else {
          this.items[index] = currItem.next;
        }

        return currItem.value;
      }

      prevItem = currItem;
      currItem = currItem.next;
    }

    return null;
  }
}
// =============================================================================

run(solve);
