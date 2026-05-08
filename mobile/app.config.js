/**
 * Dynamic Expo config: merges app.json and injects public env for Google OAuth (Auth Session).
 * 在 mobile/.env 中配置 EXPO_PUBLIC_GOOGLE_*（见 .env.example）。
 */
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...(config.extra ?? {}),
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
    googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
    googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',
  },
});
