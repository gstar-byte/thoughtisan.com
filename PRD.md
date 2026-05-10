# Lightning Capsule (闪电胶囊) - PRD

## 1. 产品愿景
Lightning Capsule 旨在打造一款极致响应、视觉精美的“第二大脑”。它不仅是一个笔记应用，更是一个能通过 AI 理解用户意图、快速归档灵感的精密系统。

## 2. 核心价值 (The Core Trio)
- **极致速度 (Lightning Speed)**: 毫秒级的响应，由于采用了 Firebase 实时流同步，数据在多端之间瞬间同步。
- **色彩美学 (Aesthetic Excellence)**: 遵循 iOS/Modern Swiss 设计风格，每个胶囊都有其独特的色值，视觉结构清晰。
- **AI 意图解析 (AI Intent Analysis)**: 利用 Gemini Pro 自动为碎片化输入分类、打标签、提取待办事项。

## 3. 功能概览
### A. 智能捕获
- 语音/文本混合输入。
- AI 自动分类（技术、个人、工作、想法等）。
- 自动提取日期和提醒。

### B. 组织与管理
- **胶囊视图**: 支持网格与列表切换。
- **状态流转**: 待办 -> 完成 -> 归档 -> 回收站。
- **多选批处理**: 极简的交互，支持批量删除和归档。

### C. 跨端体验
- 响应式 Web 设计，自适应 PC 与手机。
- PWA 支持，可像原生 App 一样添加到主屏幕。

## 4. 线框图逻辑 (Wireframe Logic)
1. **侧边栏 (Sidebar)**: 导航与分类过滤。
2. **顶栏 (Header)**: 全局搜索与视图切换。
3. **主区域 (Canvas)**: 胶囊流，左侧带有多选指示器，右侧可选操作。
4. **悬浮输入 (Floating Input)**: 始终处于视口底部的“灵感捕捉器”。

## 5. 技术架构
- **Web Frontend**: React 18, Vite, Tailwind CSS, Motion.
- **Mobile Frontend**: Expo (React Native), 跨平台共享核心代码。
- **Backend**: Firebase Auth, Firestore (Real-time).
- **AI**: Google Gemini API.

## 6. 跨端架构与原生能力策略 (Cross-Platform & Native Strategy)
本项目移动端基于 **React Native (Expo)** 构建，非套壳 Web 应用，而是底层调用真实的苹果 (iOS) 和安卓 (Android) 原生组件，确保极致的流畅度与原生手感。

针对高级功能 (Pro Features)，由于操作系统的权限沙盒差异，采取以下差异化产品策略：

### 跨端一致的核心体验
- **基础核心**: UI 渲染、笔记管理、颜色标签、云端实时同步、多媒体附件（如视频和图片上传）。双端 100% 体验一致。
- **免登录引导**: 游客模式下提供预置的 Demo 数据，用户在触发核心操作（如新建笔记）时才强制要求登录，极大降低流失率。

### iOS 与 Android 的差异化实现方案
1. **桌面小组件 (Desktop Widgets)**
   - **两端均支持**: 通过编写原生桥接代码（Swift/Kotlin）或使用 `expo-widgets` 插件实现，提供桌面的快捷访问和数据预览。

2. **常驻通知快捷方式 (Persistent Notification)**
   - **Android**: 支持。通过原生系统能力实现常驻通知栏，用户点击即可无缝唤起快速输入框。
   - **iOS**: 不支持常驻通知。**替代方案**：采用 iOS 专属的“锁屏小组件 (Lock Screen Widget)”或“控制中心快捷动作”来实现相似的快速唤起。

3. **全局边缘滑动 / 音量键快捷捕获 (Global Hardware / Edge Capture)**
   - **Android**: 部分支持。通过请求高级系统权限（系统悬浮窗权限、无障碍权限），结合原生代码监听硬件按键和全局边缘手势。
   - **iOS**: 绝对禁止。苹果极度严格的安全沙盒限制了第三方应用对物理按键的后台全局监听及系统级手势拦截。
   - **策略**: 该深层系统整合功能将作为 Android 端 Pro 用户的独占黑科技。

**产品设计建议**: 在设置页面或弹窗中，通过代码判断当前操作系统（`Platform.OS`）。如果是 iOS，则隐藏或替换掉那些无法实现的功能选项，避免给用户造成困扰；如果是 Android，则展示完整的极客功能。
