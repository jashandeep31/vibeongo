import { ExpoConfig, ConfigContext } from "expo/config";
import { version } from "./package.json";
export default ({ config }: ConfigContext) => {
  const VARIANT: "development" | "production" = process.env.APP_VARIANT! as any;

  const PACKAGE_NAME =
    VARIANT === "development" ? "com.vibeongo.devapp" : "com.vibeongo.app";

  const APP_NAME = VARIANT === "development" ? "VibeOnGo Dev" : "VibeOnGo";

  return {
    ...config,
    version,
    name: APP_NAME,
    ios: {
      ...config.ios,
    },
    android: {
      ...config.android,
      package: PACKAGE_NAME,
    },
  };
};
