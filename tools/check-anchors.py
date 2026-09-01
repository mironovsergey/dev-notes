#!/usr/bin/env python3
"""Проверка относительных ссылок и якорей в markdown-файлах репозитория.

Воспроизводит алгоритм github-slugger, по которому GitHub строит якоря
заголовков, собирает якоря всех файлов и проверяет каждую ссылку: существует
ли файл, на который она указывает, и объявлен ли в нем нужный якорь.

Запуск:

    python3 tools/check-anchors.py                     все каталоги репозитория
    python3 tools/check-anchors.py algorithms          только одно направление

Код возврата: 0, если ошибок нет, иначе 1.
"""

import pathlib
import re
import sys

# github-slugger удаляет пунктуацию, сохраняя буквы, цифры, пробелы, дефисы и
# подчеркивания, после чего заменяет каждый пробел на дефис. Дефис (0x2d) ни в
# один из диапазонов не входит и потому сохраняется: заголовок вида
# «Название - уточнение» дает якорь с тремя дефисами подряд, а не с одним.
PUNCTUATION = re.compile(
    '['
    '\x00-\x1f'
    '\x21-\x2c'
    '\x2e-\x2f'
    '\x3a-\x40'
    '\x5b-\x5e'
    '\x60'
    '\x7b-\x7e'
    '\xa0-\xbf'
    ' -⁯'
    ']'
)

HEADING = re.compile(r'^(#{1,6})\s+(.*)$')
FENCE = re.compile(r'^\s*(```|~~~)')
LINK = re.compile(r'\]\((?!https?:|mailto:)([^)#\s]*)(?:#([^)\s]*))?\)')


def slug(text):
    """Возвращает якорь GitHub для текста заголовка.

    :param text: Текст заголовка без ведущих решеток.
    :returns: Строка якоря без ведущего символа «#».
    """
    return PUNCTUATION.sub('', text.strip().lower()).replace(' ', '-')


def anchors_of(path):
    """Возвращает множество якорей, объявленных заголовками файла.

    Заголовки внутри блоков кода не учитываются: строка «# комментарий» в
    примере на Python заголовком не является. Повторяющиеся заголовки
    получают числовой суффикс, как это делает GitHub.

    :param path: Путь к markdown-файлу.
    :returns: Множество строк-якорей.
    """
    counters = {}
    result = set()
    inside_code = False

    for line in path.read_text(encoding='utf-8').splitlines():
        if FENCE.match(line):
            inside_code = not inside_code
            continue

        if inside_code:
            continue

        match = HEADING.match(line)

        if match is None:
            continue

        base = slug(match.group(2))
        index = counters.get(base, 0)
        counters[base] = index + 1
        result.add(base if index == 0 else '{}-{}'.format(base, index))

    return result


def collect(roots):
    """Возвращает список markdown-файлов в указанных каталогах.

    :param roots: Пути к каталогам или отдельным файлам.
    :returns: Отсортированный список путей.
    """
    files = set()

    for root in roots:
        path = pathlib.Path(root)

        if path.is_file():
            files.add(path)
            continue

        for found in path.rglob('*.md'):
            if '.git' not in found.parts:
                files.add(found)

    return sorted(files)


def suggest(anchor, available):
    """Подбирает якорь, отличающийся от заданного только числом дефисов.

    Смысл подсказки: самая частая ошибка - записать « - » в заголовке как два
    дефиса вместо трех.

    :param anchor: Якорь из ссылки.
    :param available: Множество якорей целевого файла.
    :returns: Единственный подходящий якорь или None.
    """
    squash = lambda value: re.sub('-+', '-', value)
    matches = [item for item in available if squash(item) == squash(anchor)]

    return matches[0] if len(matches) == 1 else None


def check(roots):
    """Проверяет ссылки и якоря в указанных каталогах.

    :param roots: Пути к каталогам или файлам.
    :returns: Список строк с описанием найденных ошибок.
    """
    files = collect(roots)
    index = {path.resolve(): anchors_of(path) for path in files}
    problems = []

    for path in files:
        for match in LINK.finditer(path.read_text(encoding='utf-8')):
            target_path, anchor = match.group(1), match.group(2)
            target = (path.parent / target_path).resolve() if target_path else path.resolve()

            if not target.exists():
                problems.append('{}: нет файла {}'.format(path, target_path))
                continue

            if anchor is None:
                continue

            if target.resolve() not in index:
                index[target.resolve()] = anchors_of(target)

            available = index[target.resolve()]

            if anchor in available:
                continue

            hint = suggest(anchor, available)
            problems.append(
                '{}: нет якоря {}#{}{}'.format(
                    path,
                    target_path,
                    anchor,
                    '  ->  возможно, #{}'.format(hint) if hint else '',
                )
            )

    return problems


def main():
    """Точка входа: печатает найденные ошибки и задает код возврата."""
    roots = sys.argv[1:] or ['.']
    problems = check(roots)

    for problem in problems:
        print(problem)

    print('файлов проверено: {}, ошибок: {}'.format(len(collect(roots)), len(problems)))

    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
