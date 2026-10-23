# 4 TypeScript в React

## Содержание

### [TypeScript в проекте React: настройка](setup.md)

- [4.1 Подключение TypeScript к проекту React](setup.md#41-подключение-typescript-к-проекту-react)
  - [Новый проект](setup.md#новый-проект)
  - [Существующий проект](setup.md#существующий-проект)
- [4.2 `tsconfig.json` для React](setup.md#42-tsconfigjson-для-react)
- [4.3 Типы React и объявления модулей](setup.md#43-типы-react-и-объявления-модулей)
  - [Основные типы `@types/react`](setup.md#основные-типы-typesreact)
  - [Объявления модулей](setup.md#объявления-модулей)
  - [`satisfies`](setup.md#satisfies)

### [Типизация компонентов и props](components.md)

- [4.4 Функциональный компонент](components.md#44-функциональный-компонент)
  - [Что возвращает компонент](components.md#что-возвращает-компонент)
  - [Классовый компонент](components.md#классовый-компонент)
- [4.5 Props](components.md#45-props)
  - [Размеченные объединения props](components.md#размеченные-объединения-props)
- [4.6 Props нативных элементов](components.md#46-props-нативных-элементов)
- [4.7 События](components.md#47-события)
  - [Три способа получить тип события](components.md#три-способа-получить-тип-события)
  - [`target` и `currentTarget`](components.md#target-и-currenttarget)
  - [Обработчик не того элемента](components.md#обработчик-не-того-элемента)
- [4.8 Обобщенные компоненты и `ref`](components.md#48-обобщенные-компоненты-и-ref)
  - [`ref` как prop](components.md#ref-как-prop)

### [Типизация хуков](hooks.md)

- [4.9 `useState`](hooks.md#49-usestate)
- [4.10 `useReducer`](hooks.md#410-usereducer)
- [4.11 `useRef`](hooks.md#411-useref)
- [4.12 `useContext`](hooks.md#412-usecontext)
- [4.13 `useMemo`, `useCallback` и пользовательские хуки](hooks.md#413-usememo-usecallback-и-пользовательские-хуки)
  - [Кортеж в результате хука](hooks.md#кортеж-в-результате-хука)
  - [Обобщенный хук и состояние асинхронной операции](hooks.md#обобщенный-хук-и-состояние-асинхронной-операции)
- [4.14 Типизация хуков React Router](hooks.md#414-типизация-хуков-react-router)

### [Типизация Redux](redux.md)

- [4.15 Действия](redux.md#415-действия)
- [4.16 Редьюсер и хранилище](redux.md#416-редьюсер-и-хранилище)
  - [Редьюсер принимает `UnknownAction`](redux.md#редьюсер-принимает-unknownaction)
  - [`RootState` и `AppDispatch`](redux.md#rootstate-и-appdispatch)
  - [Thunk](redux.md#thunk)
- [4.17 Типизированные хуки `react-redux`](redux.md#417-типизированные-хуки-react-redux)
- [4.18 Redux Toolkit](redux.md#418-redux-toolkit)
  - [`createSlice` и `PayloadAction`](redux.md#createslice-и-payloadaction)
  - [`configureStore`, `RootState`, `AppDispatch`](redux.md#configurestore-rootstate-appdispatch)
  - [`createAsyncThunk`](redux.md#createasyncthunk)
  - [Селекторы](redux.md#селекторы)
  - [Сводка: что аннотировать в Redux Toolkit](redux.md#сводка-что-аннотировать-в-redux-toolkit)
