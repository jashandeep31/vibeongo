# VibeOngo mobile app

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies from `platform/`:

   ```bash
   pnpm install
   ```

2. Point the app at the API when developing locally. The URL must be reachable
   from the device (use your LAN IP instead of `localhost` on a physical device):

   ```bash
   EXPO_PUBLIC_API_URL=http://192.168.1.10:8000
   ```

   Without this variable, development defaults to `localhost:8000` on iOS/web
   and `10.0.2.2:8000` on the Android emulator.

3. Start the app:

   ```bash
   pnpm --filter mobile-app start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## GitHub authentication

The app opens the server's existing GitHub OAuth flow and returns through the
`mobileapp://auth/callback` scheme. Production and development builds use that
scheme; Expo Go uses its generated `exp://` URL and is accepted only when the
server runs with `NODE_ENV=development`.

The GitHub OAuth application's callback URL remains the server callback:

```text
<BACKEND_URL>/api/v1/auth/github/callback
```

Add the web origin to the server's `ALLOWED_ORIGINS` if you run the mobile app
as a web build. Native sessions are stored with Expo SecureStore and API calls
should send the value in `Authorization: Bearer <token>`.

During development, the app skips GitHub and immediately uses the local
development user (`jashandeep31`). API calls include a development identity
header that the server accepts only when `NODE_ENV=development`; production
builds continue to show the GitHub login screen.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
