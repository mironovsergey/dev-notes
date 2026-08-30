/**
 * A. Поисковая система
 *
 * https://contest.yandex.ru/contest/24414/problems/A/
 *
 * Тимофей пишет свою поисковую систему.
 *
 * Имеется n документов, каждый из которых представляет собой текст из слов.
 * По этим документам требуется построить поисковый индекс. На вход системе
 * будут подаваться запросы. Запрос - некоторый набор слов. По запросу надо
 * вывести 5 самых релевантных документов.
 *
 * Релевантность документа оценивается следующим образом: для каждого
 * уникального слова из запроса берется число его вхождений в документ,
 * полученные числа для всех слов из запроса суммируются. Итоговая сумма
 * и является релевантностью документа. Чем больше сумма, тем больше документ
 * подходит под запрос.
 *
 * Сортировка документов на выдаче производится по убыванию релевантности.
 * Если релевантности документов совпадают - то по возрастанию их порядковых
 * номеров в базе (то есть во входных данных).
 *
 * Подумайте над случаями, когда запросы состоят из слов, встречающихся в малом
 * количестве документов. Что если одно слово много раз встречается в одном
 * документе?
 *
 * Формат ввода
 * В первой строке дано натуральное число n - количество документов в базе
 * (1 ≤ n ≤ 10^4). Далее в n строках даны документы по одному в строке. Каждый
 * документ состоит из нескольких слов, слова отделяются друг от друга одним
 * пробелом и состоят из маленьких латинских букв. Длина одного текста
 * не превосходит 1000 символов. Текст не бывает пустым.
 *
 * В следующей строке дано число запросов - натуральное число m (1 ≤ m ≤ 10^4).
 * В следующих m строках даны запросы по одному в строке. Каждый запрос состоит
 * из одного или нескольких слов. Запрос не бывает пустым. Слова отделяются друг
 * от друга одним пробелом и состоят из маленьких латинских букв. Число символов
 * в запросе не превосходит 100.
 *
 * Формат вывода
 * Для каждого запроса выведите на одной строке номера пяти самых релевантных
 * документов. Если нашлось менее пяти документов, то выведите столько, сколько
 * нашлось. Документы с релевантностью 0 выдавать не нужно.
 *
 * Отчет: https://contest.yandex.ru/contest/24414/run-report/109805558/
 */

const { run, readInt, readLine } = require('../../lib/io');

// Число документов в выдаче на один запрос
const TOP_SIZE = 5;

function solve() {
  const n = readInt(); // количество документов в базе
  const docs = []; // массив документов

  for (let i = 1; i <= n; i++) {
    docs.push(readLine().trim());
  }

  const m = readInt(); // число запросов
  const queries = []; // массив запросов

  for (let i = 1; i <= m; i++) {
    queries.push(readLine().trim());
  }

  const results = search(docs, queries);

  for (let i = 0; i < results.length; i++) {
    process.stdout.write(`${results[i].join(' ')}\n`);
  }
}

// =============================================================================
/**
 * Строит обратный индекс: слово -> отображение «номер документа -> число вхождений».
 *
 * Время: O(S), где S - суммарное число слов во всех документах. Память: O(S).
 *
 * @param {string[]} docs Массив документов.
 * @returns {Map<string, Map<number, number>>} Обратный индекс.
 */
function createSearchIndexes(docs) {
  const searchIndexes = new Map();

  for (let i = 0; i < docs.length; i++) {
    for (const word of docs[i].split(/\s+/)) {
      let occurrences = searchIndexes.get(word);

      if (occurrences === undefined) {
        occurrences = new Map();
        searchIndexes.set(word, occurrences);
      }

      occurrences.set(i, (occurrences.get(i) ?? 0) + 1);
    }
  }

  return searchIndexes;
}

/**
 * Возвращает релевантности документов для запроса.
 *
 * В результат попадают только документы, содержащие хотя бы одно слово запроса.
 * Это принципиально: массив релевантностей длины n, обнуляемый перед каждым
 * запросом, стоил бы O(n) на запрос независимо от того, сколько документов
 * реально подходит. При n = 10^4 документах и m = 10^4 запросах из условия это
 * 10^8 операций на одно только создание массивов.
 *
 * Слова запроса дедуплицируются: повторное слово не должно удваивать вклад.
 *
 * Время: O(суммарного числа вхождений слов запроса).
 * Память: O(числа подходящих документов).
 *
 * @param {string} query Поисковый запрос.
 * @param {Map<string, Map<number, number>>} searchIndexes Обратный индекс.
 * @returns {Map<number, number>} Отображение «номер документа -> релевантность».
 */
function createDocRelevance(query, searchIndexes) {
  const docRelevance = new Map();

  for (const word of new Set(query.split(/\s+/))) {
    const occurrences = searchIndexes.get(word);

    if (occurrences === undefined) {
      continue;
    }

    for (const [docIndex, count] of occurrences) {
      docRelevance.set(docIndex, (docRelevance.get(docIndex) ?? 0) + count);
    }
  }

  return docRelevance;
}

/**
 * Выполняет ранжирование документов по поисковым запросам
 * @param {string[]} docs Массив документов
 * @param {string[]} queries Массив запросов
 * @returns {number[][]} Массив результатов поиска
 */
function search(docs, queries) {
  const searchIndexes = createSearchIndexes(docs);
  const results = [];

  for (const query of queries) {
    // Документы с нулевой релевантностью в отображение не попадают вовсе,
    // поэтому отдельная фильтрация не нужна
    const ranked = [...createDocRelevance(query, searchIndexes)];

    quicksort(ranked);

    results.push(ranked.slice(0, TOP_SIZE).map(([docIndex]) => docIndex + 1));
  }

  return results;
}

/**
 * Обменивает местами два элемента массива
 * @param {any[]} array Массив
 * @param {number} x Индекс первого элемента
 * @param {number} y Индекс второго элемента
 */
function swap(array, x, y) {
  [array[x], array[y]] = [array[y], array[x]];
}

/**
 * Выполняет сравнение двух элементов массива
 * @param {any[]} a Первый элемент
 * @param {any[]} b Второй элемент
 * @returns {boolean} Результат сравнения
 */
function compare(a, b) {
  return a[1] !== b[1] ? a[1] > b[1] : a[0] < b[0];
}

/**
 * Делит массив на две части относительно опорного
 * @param {any[]} array Массив
 * @param {any} pivot Опорный элемент
 * @param {number} left Левая граница
 * @param {number} right Правая граница
 * @returns {number} Индекс опорного элемента после разделения
 */
function partition(array, pivot, left, right) {
  while (left <= right) {
    while (compare(array[left], pivot)) {
      left++;
    }

    while (compare(pivot, array[right])) {
      right--;
    }

    if (left <= right) {
      swap(array, left, right);
      left++;
      right--;
    }
  }

  return left;
}

/**
 * Сортирует массив быстрой сортировкой на месте.
 *
 * Рекурсия выполняется только для меньшей из двух частей, большая
 * обрабатывается продолжением цикла в том же вызове. Это ограничивает глубину
 * стека величиной O(log n) при любых входных данных; при рекурсии в обе части
 * вырожденные разбиения дали бы глубину O(n).
 *
 * Время: O(n log n) в среднем. Память: O(log n).
 *
 * @param {any[]} array Сортируемый массив; изменяется на месте.
 * @param {number} left Левая граница сортируемого отрезка, включительно.
 * @param {number} right Правая граница сортируемого отрезка, включительно.
 * @returns {void}
 */
function quicksort(array, left = 0, right = array.length - 1) {
  let low = left;
  let high = right;

  while (low < high) {
    const pivot = array[low + Math.floor((high - low) / 2)];
    const index = partition(array, pivot, low, high);

    if (index - 1 - low < high - index) {
      quicksort(array, low, index - 1);
      low = index;
    } else {
      quicksort(array, index, high);
      high = index - 1;
    }
  }
}
// =============================================================================

run(solve);
