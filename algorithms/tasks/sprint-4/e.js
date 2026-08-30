/**
 * E. Сломай меня
 *
 * https://contest.yandex.ru/contest/23991/problems/E/
 *
 * Гоша написал программу, которая сравнивает строки исключительно по их хешам.
 * Если хеш равен, то и строки равны. Тимофей увидел это безобразие и поручил
 * вам сломать программу Гоши, чтобы остальным неповадно было.
 *
 * В этой задаче вам надо будет лишь найти две различные строки, которые для
 * заданной хеш-функции будут давать одинаковое значение.
 *
 * В данной задаче необходимо использовать в качестве значений отдельных
 * символов их коды в таблице ASCII.
 *
 * Формат ввода
 * В задаче единственный тест без ввода
 *
 * Формат вывода
 * Отправьте две строки, по одной в строке. Строки могут состоять только из
 * маленьких латинских букв и не должны превышать в длину 1000 знаков каждая.
 * Код отправлять не требуется. Строки из примера использовать нельзя.
 *
 * Пример вывода:
 * ezhgeljkablzwnvuwqvp
 * gbpdcvkumyfxillgnqrv
 */

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
const STRING_LENGTH = 20;

/**
 * Возвращает полиномиальный хеш строки, вычисленный методом Горнера.
 *
 * Время: O(n). Память: O(1).
 *
 * @param {string} s Хешируемая строка.
 * @param {number} a Основание, по которому считается хеш.
 * @param {number} m Модуль.
 * @returns {number} Хеш строки в диапазоне [0, m).
 */
function polynomialHash(s, a, m) {
  let hash = 0;

  for (let i = 0; i < s.length; i++) {
    hash = (hash * a + s.charCodeAt(i)) % m;
  }

  return hash;
}

/**
 * Возвращает случайную строку из строчных латинских букв.
 *
 * Время: O(length). Память: O(length).
 *
 * @param {number} length Длина строки.
 * @returns {string} Случайная строка.
 */
function generateRandomString(length) {
  let result = '';

  for (let i = 0; i < length; i++) {
    result += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
  }

  return result;
}

/**
 * Находит две различные строки с одинаковым полиномиальным хешем.
 *
 * Используется парадокс дней рождения: вместо подбора строки под заранее
 * заданный хеш генерируются случайные строки, их хеши складываются в словарь,
 * и поиск прекращается на первом повторе. Достаточно примерно √(π·m/2) строк.
 *
 * Разница принципиальна. Подбор под фиксированный хеш требует в среднем m
 * попыток: при m = 123987123 это порядка 10^8 строк и десятки секунд работы.
 * Парадокс дней рождения дает результат примерно за 14000 попыток, то есть
 * на четыре порядка быстрее.
 *
 * Время: O(√m) в среднем. Память: O(√m).
 *
 * @param {number} a Основание, по которому считается хеш.
 * @param {number} m Модуль.
 * @returns {[string, string]} Две различные строки с равными хешами.
 */
function generateCollidingStrings(a = 1000, m = 123987123) {
  const seenByHash = new Map();

  for (;;) {
    const candidate = generateRandomString(STRING_LENGTH);
    const hash = polynomialHash(candidate, a, m);
    const previous = seenByHash.get(hash);

    if (previous !== undefined && previous !== candidate) {
      return [previous, candidate];
    }

    seenByHash.set(hash, candidate);
  }
}

// Локальная проверка: в задаче требуется отправить только две строки.
if (process.env.REMOTE_JUDGE !== 'true') {
  const assert = require('assert');

  const [first, second] = generateCollidingStrings();

  assert.notStrictEqual(first, second);
  assert.strictEqual(
    polynomialHash(first, 1000, 123987123),
    polynomialHash(second, 1000, 123987123),
  );
  assert.ok(/^[a-z]{1,1000}$/.test(first) && /^[a-z]{1,1000}$/.test(second));

  process.stdout.write(`${first}\n${second}\n`);
}
