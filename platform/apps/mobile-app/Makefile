
android-build:
	cp .env.dev .env
	cd android && ./gradlew assembleRelease

android-bundle:
	cp .env.prod .env
	npx expo prebuild --platform android --clean
	cd android && ./gradlew bundleRelease

