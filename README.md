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

### Профиль и модерация (разделы 3.2, 7.2 ТЗ)

Экран "Профиль" — редактирование опциональных полей (фото, юзернейм, "о себе", возраст, пол, кого ищет, "здесь с", увлечения) и кнопка выхода из аккаунта.

`name`/`bio`/`avatarUrls` **нельзя** писать напрямую с клиента (см. `firestore.rules`) — они проходят через модерацию (7.2) и пишутся только Cloud Functions:

- `submitProfileText` — проверяет имя/"о себе" на профанити (`obscenity`, только английский словарь; для русского нужен свой список слов или внешний API) и сохраняет.
- `submitProfilePhoto` — клиент грузит фото во временную папку `users/{uid}/pending/...` (Storage), функция прогоняет её через Google Cloud Vision SafeSearch и либо переносит в публичную `users/{uid}/photos/...`, либо удаляет и отклоняет.
- `removeProfilePhoto` / `reorderProfilePhotos` — удаление и смена порядка (первое фото = главное).

Юзернейм — отдельная механика: коллекция `/usernames/{lowercase}` резервирует имя транзакцией на клиенте (без Cloud Function, модерация не нужна — юзернеймов нет в списке полей 7.2).

**Чтобы это заработало на реальном проекте:**
- В Google Cloud Console включить **Cloud Vision API** для проекта Firebase (Cloud Functions использует Application Default Credentials — отдельный API-ключ не нужен).
- Задеплоить функции и правила: `firebase deploy --only functions,firestore:rules,firestore:indexes,storage:rules` (из корня репозитория; `functions/` — отдельный npm-пакет, `cd functions && npm install` перед первым деплоем).
- `react-native-image-picker` — новая нативная зависимость, после установки выполнить `cd ios && bundle exec pod install`.

### Друзья и сообщения (разделы 5, 6 ТЗ)

Мэтч и дружба — раздельные сущности, обе дают доступ к чату. `/friends`, `/chats` и `/chats/{id}/messages` используют тот же детерминированный id пары (`sorted(uidA, uidB).join('_')`), что и `/matches`, — вынесено в `functions/src/shared/pairId.ts`.

- Заявки в друзья (по `@username` через `/usernames/{lowercase}` или по QR-диплинку `relocantapp://addfriend/{uid}`) и их принятие/отклонение — прямые клиентские записи в `/friends`, разрешённые правилами Firestore (`get()`/`exists()` проверяют, что мэтч действительно есть для `addedVia:'match'`, и что документ ещё не существует). Отдельный Cloud Function не нужен — модерация на дружбу не распространяется (её нет в списке полей 7.2).
- **Сообщения** — только через Cloud Function `sendMessage`: проверяет профанити (тот же `obscenity`, что и в профиле) и разрешён ли контакт (мэтч — всегда; принятая дружба — только если у обеих сторон включено "Разрешить сообщения от друзей без мэтча"; блокировка — никогда). Прямая запись клиента в `/chats/*/messages` запрещена правилами.
- **Блокировка** — Cloud Function `blockUser`: удаляет общие `/matches` и `/friends` (они Cloud-Function-only) и добавляет в `blockedUserIds`. Разблокировка — обычная запись клиента (`arrayRemove`), других побочных эффектов нет.
- QR: генерация — `react-native-qrcode-svg`, сканирование — `react-native-camera-kit`. Диплинк-приём сделан вручную через `Linking.addEventListener('url', ...)`, а не через `linking`-конфиг React Navigation — из-за условного корневого навигатора (Splash/Auth/Main) полноценная интеграция линкинга непропорционально сложнее для той же цели.
- Схема `relocantapp://` зарегистрирована в `Info.plist` (`CFBundleURLTypes`) и `AndroidManifest.xml` (intent-filter на `MainActivity`); добавлены `NSCameraUsageDescription`/`NSPhotoLibraryUsageDescription` (iOS) и `CAMERA` permission (Android) для QR-сканера и пикера фото.

**Сознательно не сделано в этом проходе** (см. коммиты): фото/голосовые сообщения в чате, видеозвонки (Agora — отдельная крупная интеграция), пуши на новое сообщение/заявку в друзья (раздел 10 ещё не реализован), свайп-жест «удалить/заблокировать» в списке чатов (кнопки вместо жеста).

### Жалобы и авто-скрытие, валидация возраста (разделы 7.3, 9 ТЗ)

- **Жалобы** — клиент пишет напрямую в `/reports/{reporterId}_{targetId}_{reason}` (детерминированный id: одна жалоба на пару "автор+цель+причина", повторная жалоба той же причины обновляет тот же документ через `merge`). Правила Firestore разрешают `create` только от своего имени, с `status:'pending'` и причиной из фиксированного списка; `read` запрещён клиенту полностью (жалобы — не публичные данные); `update` разрешён только автору и только для `createdAt`/`comment`/`contentSnapshot`.
- **Авто-скрытие** — Cloud Function `onReportWritten` (триггер на `/reports/{reportId}`) на каждую запись пересчитывает число уникальных авторов жалоб с тем же `targetId`+`reason` и выставляет `autoHidden:true` (+`autoHiddenAt`), когда порог достигнут. Пороги (`functions/src/reports/autoHideThresholds.ts`): критичные причины (`underage`, `inappropriate_content`) — **1** жалоба, остальные — **5**. `autoHidden`/`autoHiddenAt` — Cloud-Function-only поля (тот же паттерн `protectedUserFields()`, что и у `verified`/`premium`); клиент не может их снять — предполагается ручная модерация через отдельную веб-панель (см. ТЗ 7.3: "этот веб-инструмент — отдельная задача разработки", в мобильный скоуп не входит).
- Скрытый пользователь уже исключался из ленты свайпов (`isEligibleCandidate`); теперь дополнительно невидим для поиска по `@username` в разделе "Добавить друга" — чтобы не выдавать сам факт скрытия, ответ для скрытого профиля тот же, что и для несуществующего юзернейма.
- Точки жалобы в UI: кнопка "⚑" на верхней свайп-карточке, ссылка "Пожаловаться" в шапке чата, long-press на чужом сообщении (передаёт текст сообщения как `contentSnapshot`).
- **Валидация возраста 18+** (раздел 9) — числовое поле `age` в профиле теперь проверяется в двух местах: в `ProfileScreen` перед сохранением (блокирует сабмит с понятной ошибкой) и в `firestore.rules` (`validAge()` на `create`/`update` документа `/users/{uid}`) как defense-in-depth на случай обхода клиента. Обязательный чекбокс "мне есть 18" при входе — отдельная сущность (подтверждение факта, не дата рождения) и не менялся.

---

Проект создан на базе [`@react-native-community/cli`](https://github.com/react-native-community/cli). Инструкции по установке окружения — в [официальном гайде React Native](https://reactnative.dev/docs/set-up-your-environment).
