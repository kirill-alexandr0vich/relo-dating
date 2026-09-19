# Relo Dating

Мобильное приложение знакомств для релокантов. React Native + TypeScript, Firebase (Auth/Firestore/Storage/Functions/Messaging), видеозвонки через Agora SDK.

Полное техническое задание: [`docs/TZ.md`](docs/TZ.md).

## Архитектура (Feature-Sliced Design)

```
src/
  app/        — точка входа, навигаторы (Root/AuthFlow/Tab), провайдеры (auth, safe area, firebase init, i18n)
  pages/      — экраны (композиция виджетов/фич под конкретный роут)
  widgets/    — крупные самостоятельные блоки UI, не завязанные на конкретные страницы
  features/   — юзер-кейсы с бизнес-логикой (sign-in, complete-registration, swipe-card, ...)
  entities/   — бизнес-сущности (user, match, chat, event) — модели, API, база UI
  shared/     — переиспользуемое без бизнес-смысла: UI-кит, i18n, константы, обработка ошибок Firebase
```

Импорты — только вниз по слоям, наружу слайс отдаёт только через свой `index.ts`. Алиасы путей (`app/*`, `pages/*`, `widgets/*`, `features/*`, `entities/*`, `shared/*`) настроены в `tsconfig.json` и `babel.config.js`.

Навигаторы (`app/navigation/RootNavigator.tsx`, `AuthFlowNavigator.tsx`, `TabNavigator.tsx`) сознательно лежат в `app/`, а не в `widgets/`: они напрямую ссылаются на конкретные `pages/*`, а `widgets` не может импортировать `pages` (это слой выше).

## Начало работы

```sh
npm install
npm run ios      # или npm run android
```

Полезные команды:

```sh
npm run typecheck   # tsc --noEmit
npm run lint        # eslint .
npm test            # jest
```

### Firebase

Перед первым запуском на устройстве/эмуляторе положите нативные конфиги проекта Firebase:

- Android: `android/app/google-services.json`
- iOS: `ios/GoogleService-Info.plist`

`@react-native-firebase/app` инициализируется автоматически на основе этих файлов, дополнительная JS-конфигурация не требуется.

### Авторизация (раздел 3 ТЗ)

Реализованы 4 способа входа (Apple, Google, Email/пароль, телефон по SMS-коду) с объединением аккаунтов и обязательными полями регистрации (имя, страна, родной язык). Прежде чем это заработает на устройстве, нужно донастроить нативную часть — этого нельзя сделать без реального проекта Firebase:

- **Google Sign-In**: вписать `webClientId` (из Firebase Console → Project settings → аккаунты Google) в `src/shared/config/googleSignIn.ts`. Для Android также нужен SHA-1/SHA-256 отпечаток в настройках проекта Firebase.
- **Sign in with Apple**: включить capability "Sign In with Apple" в Xcode (`ios/ReloDating/ReloDating.entitlements`) и в Apple Developer Console; в Firebase Console включить провайдер Apple.
- **Phone Auth**: включить провайдер "Phone" в Firebase Console. Для iOS нужен APNs-ключ (silent push для проверки reCAPTCHA), для Android — включённый Play Integrity API.
- После добавления нативных зависимостей (`@react-native-google-signin/google-signin`, `@invertase/react-native-apple-authentication`) выполнить `cd ios && bundle exec pod install`.

Экран выбора способа входа блокирует все 4 кнопки чекбоксом "мне есть 18 лет" (п.9 ТЗ) — в фиксированном списке экранов онбординга (3.3) для этого чекбокса нет отдельного шага, поэтому он размещён на первом экране флоу, до создания любого аккаунта.

Опциональные поля профиля (возраст, пол, увлечения, фото, юзернейм, "здесь с") в этот флоу не входят — это отдельная фича `features/complete-registration`-подобного профиля, которую предстоит сделать поверх текущей регистрации.

---

Проект создан на базе [`@react-native-community/cli`](https://github.com/react-native-community/cli). Инструкции по установке окружения — в [официальном гайде React Native](https://reactnative.dev/docs/set-up-your-environment).
