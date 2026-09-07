
android-build:
	cp .env.dev .env
	cd android && ./gradlew assembleRelease

android-dev:
	cp .env.dev .env
	npm run android

android-bundle:
	cp .env.prod .env
	cd android && ./gradlew assembleRelease

# npx expo prebuild --platform android --clean
