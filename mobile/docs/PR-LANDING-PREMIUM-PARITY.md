# 移动端 PR：Landing / Premium 与 Web 行为对照清单

用于分 PR 评审与验收；来源：`web/src/components/LandingPage.tsx`、`PremiumModal.tsx`、`SettingsModal.tsx`、`App.tsx` 中与营销/付费相关的交互。

---

## A. Landing（未登录营销页）

| # | Web 行为 | 移动端状态 | 备注 / PR |
|---|----------|------------|-----------|
| A1 | 深色全屏视觉 + 顶栏 Logo/品牌 | ✅ `LandingScreen` 深色 + 顶栏 | 动效与 Web Motion 不对等，后续可加 Reanimated |
| A2 | 顶栏 **Log in** → 进入登录 | ✅ | |
| A3 | 顶栏 **Sign up** → 进入登录/注册 | ✅ 与登录同入口 | 与 Web 一致（Web 均进入认证流） |
| A4 | Hero 标题/副文案 | ✅ 简写版英文+中文说明 | PR：文案与 Web 完全对齐 |
| A5 | **Get Started** → 登录 | ✅ `免费开始使用` | |
| A6 | **Google** 直接 `signInWithPopup` | ✅ `GoogleSignInButton` + `signInWithCredential` | 需配置 `EXPO_PUBLIC_GOOGLE_*`；Expo Go 需 Cloud Console OAuth |
| A7 | **Facebook** `signInWithPopup` | ⏳ 占位 `Alert` | PR：expo-auth-session Facebook 或原生 SDK |
| A8 | App Store / Google Play 展示区块 | ✅ 文案区「Coming soon」 | PR：改为真实商店链接 |
| A9 | 多设备 Mockup 区块（桌面/平板/手机） | ❌ 未做 | PR：静态图或简化插画 |
| A10 | Feature 六宫格文案 | ✅ 六条精简版 | PR：与 Web 标题/描述逐字对齐 |
| A11 | 联系表单 + 公司信息/footer | ❌ 未做 | PR：WebView 或简化表单 |
| A12 | Footer Terms/Privacy 链接 | ❌ 未做 | PR：外链 |

---

## B. Premium（升级弹窗）

| # | Web 行为 | 移动端状态 | 备注 / PR |
|---|----------|------------|-----------|
| B1 | 渐变头图 + 关闭按钮 | ✅ `PremiumModalMobile` | |
| B2 | 四条权益（AI/同步/快捷/媒体） | ✅ 文案略调 | PR：与 Web 英文逐条对齐 + i18n |
| B3 | Lifetime **$88.99** / 划线价 | ✅ | |
| B4 | **PayPal** 结账 + sandbox | ❌ App 内未嵌入 | ✅ 「浏览器打开 Web 购买」链接；PR：原生 IAP / RevenueCat |
| B5 | **Unlock VIP for Free (Test)** → `setDoc(isPremium: true)` | ✅「测试解锁 Pro」 | 与 Web 一致写 Firestore |
| B6 | 支付成功 Alert | ✅ `Alert` 中文 | |
| B7 | 错误展示 | ✅ `err` 文本 | |

---

## C. 主界面触达 Premium

| # | Web 行为 | 移动端状态 | 备注 / PR |
|---|----------|------------|-----------|
| C1 | 顶栏 **Upgrade**（非 Pro） | ✅ Crown pill「Pro」 | |
| C2 | 设置内 **Upgrade** → 关设置开 Premium | ✅ `SettingsModalMobile` | |
| C3 | 大图/视频/语音门禁 → 打开 Premium | ✅ `setShowPremiumModal` | 语音仍为「即将推出」Alert |
| C4 | Settings **Downgrade** → Firestore `isPremium: false` | ✅ `handleDowngrade` + 确认框 | |

---

## D. Settings（设置弹窗，与 Web 对照）

| # | Web 行为 | 移动端状态 | 备注 / PR |
|---|----------|------------|-----------|
| D1 | 头像/昵称/邮箱 | ✅ | |
| D2 | Account tier + Upgrade/Downgrade | ✅ | |
| D3 | Pro Features 列表 + Cloud sync 等 Toggle | ⏳ 仅一行「多设备同步」可点进升级 | PR：对齐 Web 多开关（可先本地状态） |
| D4 | Edge swipe / 报表等 Pro Toggle | ❌ | PR：功能落地后再接 |
| D5 | Sign out | ✅ | |
| D6 | Clear data | ✅ 复用 `clearAllData` | |

---

## E. Google 登录（Expo 可运行）

1. Firebase Console → 项目设置 → 你的应用 → 复制 **Web 客户端 ID** → `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`。
2. **iOS**：如有独立 iOS 客户端，创建 iOS OAuth 客户端 → `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`。
3. **Android**
   - **开发构建 / 上架包**：在 Google Cloud 创建 Android OAuth，包名与 SHA-1 用正式应用签名。
   - **Expo Go**：需将 **Expo 官方调试 SHA-1**（见 [Expo Google 认证文档](https://docs.expo.dev/guides/google-authentication/)）加入该 OAuth 客户端，或使用 **Development Build** 指向你的包名与 keystore。
4. `npx expo start` 后真机或模拟器走一遍；`id_token` 失败时优先检查 Web Client ID 是否与 Firebase 控制台一致。

---

## F. 建议 PR 切分（示例）

- **PR1**：`app.config.js` + Google 环境变量文档 + `GoogleSignInButton`（本批）。
- **PR2**：Landing 多设备图 + footer + 文案对齐。
- **PR3**：Premium：RevenueCat/Play Billing + 服务器或 Cloud Function 校验后写 `isPremium`。
- **PR4**：Settings 内 Pro toggles 与 Web 一致（可先本地 mock）。
- **PR5**：Facebook / Microsoft / Apple 登录与 Web 对等。
