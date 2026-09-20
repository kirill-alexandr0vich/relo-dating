# Настройка проекта: пошаговый план

Всё, что нельзя сделать из кода — аккаунты, консоли, ключи. Порядок важен:
каждый следующий шаг опирается на предыдущий.

Значения из этого репозитория, которые понадобятся:

| Что | Значение | Где лежит |
|---|---|---|
| Android applicationId | `com.relodating` | `android/app/build.gradle` |
| iOS bundle ID | **сейчас шаблонный** `org.reactjs.native.example.ReloDating` — заменить на шаге 3 | `ios/ReloDating.xcodeproj` |
| Min OS | iOS 15.1, Android API 26 | `ios/Podfile`, `android/build.gradle` |
| Регион Cloud Functions | `us-central1` (по умолчанию, в коде не задан) | `functions/src/**` |

---

## Шаг 0. Аккаунты

| Аккаунт | Зачем | Стоимость |
|---|---|---|
| Google | Firebase + Google Cloud (одна и та же учётка) | бесплатно |
| Apple Developer Program | APNs-ключ, Sign in with Apple, публикация в App Store | $99/год |
| Google Play Console | Play Integrity (App Check), публикация | $25 разово |

Apple и Google Play нужны только для iOS-пушей, App Check и релиза. Локально
на Android всё заработает и без них.

---

## Шаг 1. Создать проект Firebase и включить оплату

1. Открыть <https://console.firebase.google.com>, войти под своим Google-аккаунтом.
2. **Add project** → имя (например `relo-dating`) → Google Analytics можно выключить.
3. Слева внизу **Upgrade** → план **Blaze (pay as you go)** → привязать карту.
   Это обязательно: Cloud Functions 2-го поколения и Cloud Vision на
   бесплатном плане не работают. У Blaze есть бесплатные лимиты, на этапе
   разработки счёт близок к нулю.
4. Задать бюджетный алерт: **Budgets & alerts** в Google Cloud Console →
   например $10/месяц с уведомлением на почту. Страховка от случайного
   расхода на Vision API.

---

## Шаг 2. Зарегистрировать Android-приложение

1. Firebase Console → шестерёнка → **Project settings** → вкладка **General** →
   блок **Your apps** → иконка Android.
2. **Android package name**: `com.relodating` — ровно так, как в
   `android/app/build.gradle`. Опечатка здесь ломает и вход, и пуши.
3. **Debug signing certificate SHA-1** — обязательно для Google Sign-In и
   телефонной авторизации. Получить:
   ```bash
   cd android && ./gradlew signingReport
   ```
   Скопировать `SHA1` и `SHA-256` из блока `Variant: debug` → вставить в поле
   (позже, для релиза, добавить туда же отпечатки ключа подписи из Play Console
   → App integrity → App signing).
4. **Download google-services.json** → положить файл в:
   ```
   android/app/google-services.json
   ```
5. Открыть скачанный файл, найти в нём `oauth_client` с `"client_type": 3` —
   это **web client ID** вида `1234567890-abcdef.apps.googleusercontent.com`.
   Вставить его в `src/shared/config/googleSignIn.ts`:
   ```ts
   export const GOOGLE_WEB_CLIENT_ID = '1234567890-abcdef.apps.googleusercontent.com';
   ```
   Без него Google Sign-In падает на старте.

---

## Шаг 3. Зарегистрировать iOS-приложение

1. **Сначала поменять bundle ID** — в репозитории до сих пор шаблонный
   `org.reactjs.native.example.ReloDating`, с ним нельзя ни публиковаться, ни
   настроить пуши. В Xcode: открыть `ios/ReloDating.xcworkspace` → таргет
   **ReloDating** → **Signing & Capabilities** → **Bundle Identifier** →
   `com.relodating` (или свой обратный домен). Сделать это в обеих
   конфигурациях (Debug и Release).
2. Там же выбрать свою **Team** (аккаунт Apple Developer) и включить
   **Automatically manage signing**.
3. Firebase Console → **Project settings** → **Your apps** → иконка iOS →
   **iOS bundle ID**: тот же `com.relodating`.
4. **Download GoogleService-Info.plist** → положить в
   `ios/ReloDating/GoogleService-Info.plist`, **и обязательно добавить файл в
   Xcode**: перетащить его в навигаторе проекта в папку `ReloDating`, в диалоге
   отметить **Copy items if needed** и галочку у таргета **ReloDating**. Файл,
   лежащий только на диске, приложением не подхватится.
5. Установить поды:
   ```bash
   cd ios && pod install
   ```

---

## Шаг 4. Включить способы входа

Firebase Console → **Authentication** → **Get started** → вкладка
**Sign-in method**, включить:

1. **Email/Password** — просто Enable.
2. **Phone** — Enable. Для Android нужен SHA-1 из шага 2; для iOS телефонная
   авторизация использует тихий push, то есть заработает после шага 5.
   Для тестов удобно добавить номер в **Phone numbers for testing**.
3. **Google** — Enable, указать support email.
4. **Apple** — Enable. Для нативного входа на iOS достаточно включить провайдер
   здесь и добавить capability **Sign in with Apple** в Xcode
   (Signing & Capabilities → + Capability). Поля Services ID / ключа нужны
   только для веб-флоу, у нас его нет.

---

## Шаг 5. APNs-ключ для пушей на iOS

1. <https://developer.apple.com/account> → **Certificates, Identifiers & Profiles**
   → слева **Keys** → **+**.
2. Имя (например `relo-dating-apns`), отметить **Apple Push Notifications
   service (APNs)** → **Continue** → **Register**.
3. **Download** — файл `AuthKey_XXXXXXXXXX.p8`. Скачать можно **один раз**,
   сохранить в надёжное место. Записать:
   - **Key ID** — 10 символов из имени файла;
   - **Team ID** — вверху справа в аккаунте разработчика, тоже 10 символов.
4. Firebase Console → **Project settings** → вкладка **Cloud Messaging** →
   блок **Apple app configuration** → **APNs Authentication Key** → **Upload**:
   файл `.p8`, Key ID, Team ID.
5. В Xcode для таргета: **Signing & Capabilities** → **+ Capability** →
   **Push Notifications**. Если планируете data-пуши (например, будущие
   видеозвонки) — добавить ещё **Background Modes** → **Remote notifications**.

На Android ничего делать не нужно: разрешение `POST_NOTIFICATIONS` уже в
манифесте, FCM работает через `google-services.json`.

---

## Шаг 6. Firestore, Storage и Vision API

1. Firebase Console → **Firestore Database** → **Create database** →
   **Production mode** → регион: берите **us-central** или ближайший к
   `us-central1`, где живут функции (иначе каждый вызов платит за
   межрегиональный трафик и задержку). Регион менять потом нельзя.
2. **Storage** → **Get started** → тот же регион. Правила зальются из
   репозитория на шаге 8, стартовые можно оставить.
3. **Cloud Vision API** (модерация фото): <https://console.cloud.google.com> →
   вверху выбрать **тот же проект** → **APIs & Services** → **+ Enable APIs and
   services** → найти **Cloud Vision API** → **Enable**. Биллинг уже включён
   через Blaze.

---

## Шаг 7. Локальные файлы окружения

```bash
cp functions/.env.example functions/.env
```

Пока оставить `ENFORCE_APP_CHECK=false` — включите на шаге 9, когда App Check
будет зарегистрирован. Файл в `.gitignore`, коммитить его не нужно.

---

## Шаг 8. Первый деплой

```bash
npm install -g firebase-tools
firebase login                    # откроется браузер, войти тем же Google-аккаунтом
firebase use --add                # выбрать проект, алиас: default
firebase deploy --only firestore:rules,firestore:indexes,storage,functions
```

Что происходит:

- при первом деплое функций Firebase попросит включить API (Cloud Functions,
  Cloud Build, Artifact Registry, Eventarc) — согласиться;
- составные индексы Firestore строятся несколько минут, статус виден в консоли
  → **Firestore** → **Indexes**. Пока строятся, лента свайпов будет отдавать
  ошибку — это нормально;
- деплой функций требует Node 20 локально (`node -v`), как в
  `functions/package.json`.

Проверка: Firebase Console → **Functions** — должно быть **18** функций:
13 вызываемых из приложения (`recordSwipe`, `sendMessage`, `sendChatMedia`,
`markChatRead`, `hideChat`, `blockUser`, `submitProfileText`,
`submitProfilePhoto`, `removeProfilePhoto`, `reorderProfilePhotos`,
`fetchSwipeCandidates`, `lookupUserByUsername`, `deleteAccount`) и 5 триггеров
Firestore (`onSwipeCreated`, `onReportWritten`, `onMatchCreated`,
`onMessageCreated`, `onFriendshipWritten`).

---

## Шаг 9. App Check

Делать **после** того, как приложение запустилось и всё остальное работает:
включённый App Check при неверной настройке отрезает и настоящее приложение.

### 9.1 Android (Play Integrity)

1. Загрузить хотя бы одну сборку в Play Console (можно во внутренний тест) —
   Play Integrity работает только для приложений, известных Play.
2. Play Console → ваше приложение → **Test and release** → **App integrity** →
   скопировать **SHA-256** ключа подписи приложения.
3. Firebase Console → **App Check** → вкладка **Apps** → Android-приложение →
   **Play Integrity** → **Register** (SHA-256 подтянется из шага 2 настроек
   проекта, при необходимости добавить вручную).

### 9.2 iOS (App Attest)

Firebase Console → **App Check** → **Apps** → iOS-приложение → **App Attest** →
**Register**. Отдельный ключ не нужен, достаточно Team ID из аккаунта
разработчика. App Attest работает только на реальном устройстве, не в симуляторе.

### 9.3 Debug-токен для сборок разработчика

1. Запустить debug-сборку (`npm run android` / `npm run ios`).
2. В логе найти строку вида
   `App Check debug token: 3a1b...` (Android — в `adb logcat`, iOS — в консоли Xcode).
3. Firebase Console → **App Check** → **Apps** → ⋮ у нужного приложения →
   **Manage debug tokens** → **Add debug token** → вставить, дать имя.

### 9.4 Включить принуждение

```bash
# functions/.env
ENFORCE_APP_CHECK=true
```

```bash
firebase deploy --only functions
```

Опционально там же, в **App Check** → вкладка **APIs**, можно включить
enforcement для **Cloud Firestore** и **Cloud Storage**. Делайте это только
после того, как убедились, что приложение стабильно получает токены, иначе
клиент потеряет доступ к данным.

---

## Шаг 10. Проверка, что всё живо

1. Запустить приложение на двух устройствах (или устройство + эмулятор) с
   разными аккаунтами.
2. Заполнить анкеты, добавить фото — фото должно загрузиться (значит Vision API
   и Storage настроены).
3. Свайпнуть друг друга вправо — должен появиться экран мэтча и прийти пуш обоим.
4. Написать сообщение при закрытом приложении у получателя — должен прийти пуш
   с текстом; открыть чат и написать снова — пуша быть не должно (presence).
5. Проверить логи: Firebase Console → **Functions** → **Logs**. Ошибки
   `permission-denied` в `fetchSwipeCandidates` обычно означают недостроенные
   индексы (шаг 8).

---

## Что останется за рамками

Эти пункты ТЗ требуют отдельных сторонних сервисов и в проекте не реализованы:

- **Верификация профиля** (7.1) — AWS Rekognition или аналог;
- **Монетизация** (8) — RevenueCat + App Store Connect / Play Billing;
- **Видеозвонки** (6.4) — Agora;
- **Админ-панель модератора** (7.3) — отдельное веб-приложение.
