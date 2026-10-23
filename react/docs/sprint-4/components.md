# Типизация компонентов и props

## 4.4 Функциональный компонент

> 📌 **Типизированный компонент** - функция, у которой единственный
> параметр аннотирован типом props, а тип результата выводится компилятором
> из возвращаемого JSX (`React.JSX.Element`, частный случай `ReactNode`).

```tsx
import type { FC, ReactNode } from 'react';

interface MovieProps {
  title: string;
  year?: number;
  children?: ReactNode;
}

function Movie({ title, year = 2000, children }: MovieProps) {
  return (
    <article>
      <h2>{title} ({year})</h2>
      {children}
    </article>
  );
}

// Равносильная запись через FC
const MovieFC: FC<MovieProps> = ({ title }) => <h2>{title}</h2>;
```

| | `function Movie(props: MovieProps)` | `const Movie: FC<MovieProps>` |
| --- | --- | --- |
| `children` | Только если объявлен в props | То же: с `@types/react` 18 `FC` не добавляет `children` неявно |
| Обобщенный компонент | `function List<T>(props: ListProps<T>)` | Невозможен: `FC` фиксирует `P` |
| Тип результата | Выводится | `ReactNode \| Promise<ReactNode>` |
| Статические поля (`displayName`) | Присваиваются вручную | Известны типу |

Записи равносильны для обычных компонентов; обобщенные
([4.8](#48-обобщенные-компоненты-и-ref)) пишутся только функцией, поэтому
✅ единый стиль проекта - функция с аннотированным параметром.

`interface` или `type` для props - вопрос соглашения; разница появляется
при расширении (`extends` против `&`) и объединениях (только `type`).

### Что возвращает компонент

Допустимый тип результата - `ReactNode`; JSX отвергает компонент с другим
типом:

```tsx
function Plain(): string { return 'текст'; }          // допустимо
function Maybe({ show }: { show: boolean }): ReactNode { return show ? <b>показан</b> : null; }

function Bad(): { text: string } { return { text: 'object' }; }
<Bad />
// TS2786: 'Bad' cannot be used as a JSX component.
//   Its type '() => { text: string; }' is not a valid JSX element type.
```

Аннотировать результат обычно не нужно: вывод точнее и не мешает вернуть
`null` из ранней ветки.

### Классовый компонент

🕰️ Props и состояние - параметры обобщения `Component<P, S>`; методы
жизненного цикла получают типы из них:

```tsx
import { Component } from 'react';

interface CounterState {
  count: number;
}

class ClassCounter extends Component<MovieProps, CounterState> {
  state: Readonly<CounterState> = { count: 0 };

  componentDidUpdate(prevProps: MovieProps, prevState: CounterState) {
    if (prevState.count !== this.state.count) {
      document.title = `${this.props.title}: ${this.state.count}`;
    }
  }

  render() {
    return <button onClick={() => this.setState({ count: this.state.count + 1 })}>{this.state.count}</button>;
  }
}
```

`Readonly<CounterState>` у поля `state` запрещает `this.state.count = 1` -
изменение мимо `setState`. Конструктор, если он нужен, принимает `props:
MovieProps`.

---

## 4.5 Props

> 📌 **Тип props** - объектный тип, описывающий контракт компонента:
> обязательные и необязательные поля, слоты для разметки, допустимые
> варианты значений и их взаимные ограничения.

```tsx
interface CardProps {
  title: string;
  children: ReactNode;       // обязательный слот
  footer?: ReactNode;        // необязательный слот
  size?: 'sm' | 'md' | 'lg'; // ограниченный набор значений вместо string
}

function Card({ title, children, footer, size = 'md' }: CardProps) {
  return (
    <section className={`card card_size_${size}`}>
      <h2>{title}</h2>
      {children}
      {footer && <footer>{footer}</footer>}
    </section>
  );
}
```

Что проверяет компилятор при использовании:

| Использование | Ошибка |
| --- | --- |
| `<Movie title="x"><p>…</p></Movie>` без `children` в props | `TS2322: … Property 'children' does not exist on type 'IntrinsicAttributes & MovieProps'` |
| `<Movie title="x" year={1979} />` без `year` в props | `Property 'year' does not exist on type …` - проверка избыточных свойств |
| `<Movie title={42} />` | `TS2322: Type 'number' is not assignable to type 'string'` |
| `<Card size="xl" />` | `TS2322: Type '"xl"' is not assignable to type '"lg" \| "md" \| "sm"'` |

Правила:

- **Слот** (`children`, `footer`, `icon`) - `ReactNode`: принимает элемент,
  строку и `null`. `ReactElement` - только если нужен именно элемент.
- **Значение по умолчанию** - в деструктуризации; поле при этом
  необязательное (`year?`). Внутри компонента `year` уже `number`, а не
  `number | undefined`.
- **Ограниченный набор** - объединение литералов, а не `string`: опечатка
  ловится на этапе компиляции, автодополнение подсказывает варианты.
- **`readonly`** для массивов в props (`items: readonly Item[]`) документирует,
  что компонент их не изменяет, и позволяет передавать замороженные данные.

### Размеченные объединения props

Когда набор props зависит от варианта компонента, объединение выражает
это точнее, чем набор необязательных полей:

```tsx
type ButtonProps =
  | { variant: 'link'; href: string; onClick?: never }
  | { variant: 'action'; onClick: () => void; href?: never };

function Button(props: ButtonProps & { children: ReactNode }) {
  if (props.variant === 'link') {
    // Внутри ветки TypeScript знает, что href: string
    return <a href={props.href}>{props.children}</a>;
  }
  return <button onClick={props.onClick}>{props.children}</button>;
}

<Button variant="link" href="/list">Список</Button>
<Button variant="action" onClick={save}>Сохранить</Button>
<Button variant="link" href="/x" onClick={save}>x</Button>
// TS2322: Types of property 'onClick' are incompatible. Type '() => void' is not assignable to type 'undefined'.
```

`onClick?: never` запрещает поле в варианте `link`: без него объединение
допустило бы ссылку с обработчиком. Деструктуризация в сигнатуре сужению не
мешает: проверка `variant` сужает и остальные деструктурированные
переменные, если их не переприсваивают.

---

## 4.6 Props нативных элементов

Компонент-обертка над `<button>` или `<input>` должен принимать все, что
принимает элемент: `disabled`, `aria-*`, `onClick`, `type`. Перечислять их
вручную бессмысленно - тип берется из React.

> 📌 **`ComponentProps<'tag'>`** - тип всех props нативного элемента `tag`
> вместе с `ref`; **`ComponentPropsWithoutRef<'tag'>`** - то же без `ref`.

```tsx
import type { ComponentProps, ComponentPropsWithoutRef, ReactNode, Ref } from 'react';

// Все props кнопки плюс свои; ref включен, потому что в React 19 ref - обычный prop
interface IconButtonProps extends ComponentProps<'button'> {
  icon: ReactNode;
}

function IconButton({ icon, children, ...rest }: IconButtonProps) {
  return (
    <button {...rest}>
      {icon}
      {children}
    </button>
  );
}

<IconButton icon="★" type="button" disabled aria-label="В избранное" />
```

Когда собственный prop совпадает по имени с нативным, но имеет другой
смысл, нативный убирается через `Omit`:

```tsx
// Свой onChange с числом вместо DOM-события
interface NumberInputProps extends Omit<ComponentPropsWithoutRef<'input'>, 'onChange' | 'value'> {
  value: number;
  onChange: (value: number) => void;
  ref?: Ref<HTMLInputElement>;
}

function NumberInput({ value, onChange, ref, ...rest }: NumberInputProps) {
  return <input ref={ref} type="number" value={value} onChange={(e) => onChange(e.target.valueAsNumber)} {...rest} />;
}
```

Без `Omit` компилятор сообщил бы о конфликте: `onChange` в `input` -
`ChangeEventHandler`, и объявить его `(value: number) => void` в наследнике
нельзя.

`ComponentProps<typeof Card>` работает и для собственных компонентов -
когда нужен тип props чужого компонента без его экспорта
([4.3](setup.md#43-типы-react-и-объявления-модулей)).

---

## 4.7 События

> 📌 **Типы событий React** - обобщенные типы `ChangeEvent<T>`,
> `MouseEvent<T>`, `SubmitEvent<T>`, `KeyboardEvent<T>` из `@types/react`,
> где `T` - тип DOM-элемента, на котором стоит обработчик; они описывают
> синтетическое событие ([1.23](../sprint-1/events-and-forms.md#123-синтетические-события)),
> а не нативное.

```tsx
import type { ChangeEvent, ChangeEventHandler, KeyboardEvent, MouseEvent, SubmitEvent } from 'react';

function LoginForm({ onLogin }: { onLogin: (login: string, remember: boolean) => void }) {
  const [login, setLogin] = useState('');
  const [remember, setRemember] = useState(false);

  // Тип события задается по элементу: ChangeEvent<HTMLInputElement>
  const handleLoginChange = (e: ChangeEvent<HTMLInputElement>) => {
    setLogin(e.target.value); // target: EventTarget & HTMLInputElement - value доступен
  };

  // Тот же тип через тип обработчика целиком
  const handleRememberChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    setRemember(e.target.checked);
  };

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    // currentTarget - всегда сама форма, поэтому FormData строится без проверок
    const data = new FormData(e.currentTarget);
    onLogin(String(data.get('login')), remember);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setLogin('');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="login" value={login} onChange={handleLoginChange} onKeyDown={handleKeyDown} />
      <label>
        <input type="checkbox" checked={remember} onChange={handleRememberChange} />
        Запомнить
      </label>
      {/* Inline-обработчик: тип e выводится из атрибута, аннотация не нужна */}
      <button type="submit" onClick={(e) => e.currentTarget.blur()}>Войти</button>
    </form>
  );
}
```

🕰️ Обработчик отправки формы раньше типизировали `FormEvent<HTMLFormElement>`;
в актуальных типах `FormEvent` помечен устаревшим, а `onSubmit` ожидает
`SubmitEvent`.

### Три способа получить тип события

| Способ | Когда |
| --- | --- |
| Inline в JSX: `onChange={(e) => …}` | Тип `e` выводится из атрибута; аннотация не нужна |
| Аннотация параметра: `(e: ChangeEvent<HTMLInputElement>)` | Обработчик объявлен отдельно от разметки |
| Тип обработчика целиком: `ChangeEventHandler<HTMLInputElement>` | То же; короче при нескольких параметрах, задает и тип результата |

### `target` и `currentTarget`

- `e.currentTarget` всегда типизирован как `T` - элемент с обработчиком.
- `e.target` типизирован как элемент только в `ChangeEvent`, `FocusEvent` и
  `SubmitEvent`; в остальных событиях это `EventTarget`, потому что событие
  могло произойти на вложенном элементе ([1.24](../sprint-1/events-and-forms.md#124-всплытие-и-захват-target-и-currenttarget)).
  Например, `<div onClick={(e) => e.target.value}>` дает `TS2339: Property
  'value' does not exist on type 'EventTarget'`. ✅ Для чтения данных элемента с
  обработчиком - `currentTarget`; для `target` нужно сужение
  `instanceof HTMLInputElement`, а не `as`.

### Обработчик не того элемента

Тип события привязан к элементу, и подмена ловится:

```tsx
const handleChange = (e: ChangeEvent<HTMLInputElement>) => e.target.value;
<button onChange={handleChange} />
// TS2322: Type '(e: ChangeEvent<HTMLInputElement>) => string' is not assignable to type 'ChangeEventHandler<HTMLButtonElement>'.
//   Type 'HTMLButtonElement' is missing the following properties from type 'HTMLInputElement': accept, align, alt, …
```

Обработчик в props объявляется с полным типом события, чтобы родитель
получил типизированный аргумент:

```tsx
interface ItemProps {
  id: number;
  onSelect: (id: number, e: MouseEvent<HTMLLIElement>) => void;
}

function Item({ id, onSelect }: ItemProps) {
  return <li onClick={(e) => onSelect(id, e)}>Элемент {id}</li>;
}
```

---

## 4.8 Обобщенные компоненты и `ref`

> 📌 **Обобщенный компонент** - функция-компонент с параметром типа `T`,
> который выводится из переданных props; так один компонент списка
> типизирует `renderItem` для элементов любого типа.

```tsx
interface ListProps<T> {
  items: readonly T[];
  getKey: (item: T) => string | number;
  renderItem: (item: T) => ReactNode;
}

function List<T>({ items, getKey, renderItem }: ListProps<T>) {
  return <ul>{items.map((item) => <li key={getKey(item)}>{renderItem(item)}</li>)}</ul>;
}

interface Laureate {
  id: string;
  firstname: string;
}

function Laureates({ laureates }: { laureates: Laureate[] }) {
  // T выводится из items; в renderItem параметр item типизирован как Laureate
  return <List items={laureates} getKey={(l) => l.id} renderItem={(l) => l.firstname} />;
}
```

`T` не указывается при использовании - он выводится из `items`, и
компилятор проверяет, что `getKey` и `renderItem` согласованы с ним. Это и
есть причина писать компоненты функциями, а не `FC`: у `FC<P>` параметр
типа фиксирован при объявлении.

### `ref` как prop

С React 19 `ref` функционального компонента - обычный prop, и типизируется
он как `Ref<T>`, где `T` - тип узла или дескриптора:

```tsx
import { useImperativeHandle, useRef, type Ref } from 'react';

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  ref?: Ref<HTMLInputElement>;
}

function NumberInput({ value, onChange, ref }: NumberInputProps) {
  return <input ref={ref} type="number" value={value} onChange={(e) => onChange(e.target.valueAsNumber)} />;
}

// Ограниченный дескриптор вместо DOM-узла
interface VideoHandle {
  play: () => void;
  pause: () => void;
}

function VideoPlayer({ src, ref }: { src: string; ref?: Ref<VideoHandle> }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Наружу отдается ограниченный набор методов, а не сам DOM-узел
  useImperativeHandle(ref, () => ({
    play: () => videoRef.current?.play(),
    pause: () => videoRef.current?.pause(),
  }), []);
  return <video ref={videoRef} src={src} />;
}

function Player() {
  const handle = useRef<VideoHandle>(null);
  return (
    <>
      <VideoPlayer src="/movie.mp4" ref={handle} />
      <button onClick={() => handle.current?.play()}>▶</button>
    </>
  );
}
```

`Ref<T>` принимает и объект `RefObject<T | null>`, и callback-ref, и
`null`. Внутри компонента `ref` передается элементу как есть - его тип
совпадает с типом, который ожидает `<input ref>`.

🕰️ До React 19 - `forwardRef<T, P>` с типом узла первым параметром и типом
props вторым; `ref` приходил вторым аргументом функции:

```tsx
import { forwardRef, type ComponentPropsWithoutRef } from 'react';

interface FancyInputProps extends ComponentPropsWithoutRef<'input'> {
  label: string;
}

const FancyInput = forwardRef<HTMLInputElement, FancyInputProps>(function FancyInput({ label, ...rest }, ref) {
  return (
    <label>
      {label}
      <input ref={ref} {...rest} />
    </label>
  );
});
```

Запись компилируется и с типами 19, но в новом коде
не используется ([1.22](../sprint-1/hooks.md#122-ссылки-useref-createref-и-forwardref)).

---

[← TypeScript в проекте React: настройка](setup.md) · [К содержанию спринта](README.md) ·
[Далее: типизация хуков →](hooks.md)
