# Relo Dating

Мобильное приложение знакомств для релокантов. React Native + TypeScript, Firebase (Auth/Firestore/Storage/Functions/Messaging), видеозвонки через Agora SDK.

Полное техническое задание: [`docs/TZ.md`](docs/TZ.md).

## Архитектура (Feature-Sliced Design)

```
src/
  app/        — точка входа, провайдеры (navigation, safe area, firebase init, i18n)
  pages/      — экраны (композиция виджетов/фич под конкретный роут)
  widgets/    — крупные самостоятельные блоки UI (например, TabNavigator)
  features/   — юзер-кейсы с бизнес-логикой (swipe-card, send-message, add-friend, ...)
  entities/   — бизнес-сущности (user, match, chat, event) — модели, API, база UI
  shared/     — переиспользуемое без бизнес-смысла: UI-кит, i18n, обработка ошибок Firebase
```

Импорты — только вниз по слоям, наружу слайс отдаёт только через свой `index.ts`. Алиасы путей (`app/*`, `pages/*`, `widgets/*`, `features/*`, `entities/*`, `shared/*`) настроены в `tsconfig.json` и `babel.config.js`.

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

---

Проект создан на базе [`@react-native-community/cli`](https://github.com/react-native-community/cli). Инструкции по установке окружения — в [официальном гайде React Native](https://reactnative.dev/docs/set-up-your-environment).
