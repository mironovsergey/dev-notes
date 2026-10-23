# TypeScript в проекте React: настройка

## 4.1 Подключение TypeScript к проекту React

> 📌 **TypeScript в React-проекте** - проверка типов поверх JSX: файлы
> `.tsx` содержат разметку и типы, компилятор проверяет их, а сборщик
> превращает в JavaScript, отбрасывая типы; в браузер TypeScript не попадает.

Три пакета:

| Пакет | Роль |
| --- | --- |
| `typescript` | Компилятор `tsc`: проверка типов; в сборке Vite не участвует |
| `@types/react` | Типы библиотеки `react`: `ReactNode`, `FC`, хуки, события |
| `@types/react-dom` | Типы `react-dom`: `createRoot`, `createPortal` |

Сам `react` типов не содержит, поэтому версии `@types/react` и `react`
должны совпадать по мажорной версии: типы 19.x знают, что `ref` - обычный
prop и что `useRef` требует аргумент ([4.11](hooks.md#411-useref)).

### Новый проект

```sh
npm create vite@latest my-app -- --template react-ts
```

Шаблон `react-ts` дает готовые `tsconfig` (типы для импорта CSS и картинок
подключены через `vite/client`) и проверку `tsc -b` в скрипте сборки.
Проверка типов и сборка разделены: Vite транспилирует `.tsx` без проверки -
быстро, а `tsc` проверяет типы отдельно, в `npm run build` и в CI.

🕰️ `npx create-react-app my-app --template typescript` - Create React App
в 2023 году исключен из рекомендаций документации React, а в 2025
официально объявлен устаревшим; новые проекты создаются на Vite или на
фреймворке (Next.js, React Router framework).

### Существующий проект

1. `npm install --save-dev typescript @types/react @types/react-dom`.
2. `tsconfig.json` в корне ([4.2](#42-tsconfigjson-для-react)).
3. Файлы переименовываются постепенно: `.js` → `.ts`, `.jsx` → `.tsx`; с
   `allowJs: true` смешанный проект компилируется, и миграция идет
   файл за файлом.
4. Для библиотек без встроенных типов - пакет `@types/<имя>` из
   DefinitelyTyped; если нет и его - собственное объявление
   ([4.3](#43-типы-react-и-объявления-модулей)).

Файл с JSX обязан иметь расширение `.tsx`: в `.ts` угловые скобки
трактуются как приведение типа `<T>value`, и разметка не парсится.

---

## 4.2 `tsconfig.json` для React

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

| Параметр | Зачем в React-проекте |
| --- | --- |
| `jsx: "react-jsx"` | JSX компилируется в вызовы `react/jsx-runtime` без `import React` ([1.5](../sprint-1/fundamentals.md#15-jsx)). 🕰️ `"react"` - классический runtime с `React.createElement`, требует импорт React в каждом файле |
| `lib: ["DOM", "DOM.Iterable"]` | Типы `HTMLInputElement`, `Event`, `document`; без `DOM` не типизируются ни события, ни ссылки на узлы |
| `strict: true` | Включает `strictNullChecks`, `noImplicitAny` и остальные строгие проверки; в TypeScript 6 включен по умолчанию. Без него `useRef<HTMLInputElement>(null).current` не потребует проверки на `null`, а props без аннотации станут `any` |
| `noUncheckedIndexedAccess` | `array[i]` и `record[key]` получают тип `T \| undefined` - обращение к элементу требует проверки |
| `moduleResolution: "bundler"` | Разрешение импортов как в сборщике: без расширений, с `exports` пакетов |
| `verbatimModuleSyntax` | Импорт типов пишется явно `import type` / `import { type X }` - сборщик, транспилирующий файлы по одному, точно знает, что удалить |
| `isolatedModules` | Каждый файл компилируется отдельно - требование esbuild/SWC |
| `noEmit` | `tsc` только проверяет; JavaScript производит сборщик |
| `skipLibCheck` | Не проверять `.d.ts` в `node_modules`: быстрее, и чужие ошибки типов не ломают сборку |
| `types: ["vite/client"]` | Типы `import.meta.env` и импортов CSS/изображений от Vite |
| `target` | Уровень синтаксиса на выходе `tsc`; при `noEmit` в основном определяет набор доступных типов стандартной библиотеки (`Array.prototype.at`, `Object.groupBy`) и семантику полей классов |

`strict` - не опция, а условие: все примеры конспекта написаны в
предположении, что он включен. Без аннотации параметра
`function Greeting({ name }) {…}` дает `TS7031: Binding element 'name'
implicitly has an 'any' type`.

---

## 4.3 Типы React и объявления модулей

### Основные типы `@types/react`

| Тип | Что описывает | Где применяется |
| --- | --- | --- |
| `ReactNode` | Все, что React способен отрисовать: элемент, строка, число, массив, `null`, `undefined`, `boolean` | `children`, слоты в props, результат компонента |
| `ReactElement` | Результат JSX-выражения: объект с `type` и `props` | Значение, которое должно быть именно элементом |
| `React.JSX.Element` | `ReactElement` в конкретизации для JSX | Явный тип результата компонента. ⚠️ Глобального `JSX.Element` в типах 19 нет: обращение к нему дает `TS2503: Cannot find namespace 'JSX'` |
| `FC<P>` | Тип функционального компонента с props `P` | Альтернатива аннотации параметра ([4.4](components.md#44-функциональный-компонент)) |
| `PropsWithChildren<P>` | `P & { children?: ReactNode }` | Короткая запись props со слотом |
| `ComponentProps<T>` | Props элемента или компонента `T`: `ComponentProps<'button'>`, `ComponentProps<typeof Card>` | Расширение нативных элементов ([4.6](components.md#46-props-нативных-элементов)) |
| `CSSProperties` | Объект для `style` | Темы, вычисляемые стили |
| `Ref<T>`, `RefObject<T>` | Ссылка на узел или значение | `useRef`, `ref` как prop ([4.8](components.md#48-обобщенные-компоненты-и-ref)) |
| `ChangeEvent<T>`, `MouseEvent<T>`, `SubmitEvent<T>`, … | Синтетические события по элементу `T` | Обработчики ([4.7](components.md#47-события)) |
| `Dispatch<SetStateAction<T>>` | Тип setter из `useState` | Передача setter в потомка ([4.9](hooks.md#49-usestate)) |

Правило импорта: типы - через `import type { ReactNode } from 'react'` или
`import { useState, type ReactNode } from 'react'`; при
`verbatimModuleSyntax` обычный импорт типа - ошибка компиляции.

```tsx
import type { ComponentProps, ReactElement, ReactNode } from 'react';

// ComponentProps<typeof Component> - тип props собственного компонента без его экспорта
type CardProps = ComponentProps<typeof Card>;

function Title(): React.JSX.Element {
  return <h1>Заголовок</h1>;
}

const element: ReactElement = <Title />;
const node: ReactNode = ['текст', 1, null, <b key="b">x</b>];
```

### Объявления модулей

Сборщик умеет импортировать CSS-модули и картинки, а компилятор о таких
модулях не знает: `import styles from './card.module.css'` без объявления -
`TS2307: Cannot find module './card.module.css' or its corresponding type
declarations`. Решение - файл `.d.ts` с **объявлением модуля по шаблону**:

```ts
// src/modules.d.ts
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.svg' {
  const url: string;
  export default url;
}
```

В Vite эти объявления уже есть в `vite/client`; собственные нужны для
нестандартных расширений или другого сборщика. Тот же прием - `declare module
'имя-библиотеки'` - закрывает библиотеку без типов, пока для нее не появится
`@types/…`.

### `satisfies`

Оператор `satisfies` проверяет, что значение соответствует типу, **не
расширяя** его до этого типа: литералы остаются литералами.

```tsx
const theme = {
  primary: { color: 'white', backgroundColor: 'navy' },
  danger: { color: 'white', backgroundColor: 'crimson' },
} satisfies Record<string, CSSProperties>;

theme.primary.color; // 'white', а не string; theme.warning - ошибка, ключа нет
```

С аннотацией `const theme: Record<string, CSSProperties>` тип потерял бы
конкретные ключи и значения: `theme.warning` прошло бы проверку, а
`theme.primary.color` имело бы общий тип цвета из `CSSProperties`.

---

[← К содержанию спринта](README.md) · [Далее: типизация компонентов и props →](components.md)
