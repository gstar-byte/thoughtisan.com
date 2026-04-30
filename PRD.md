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
- **Frontend**: React 18, Vite, Tailwind CSS, Motion.
- **Backend**: Firebase Auth, Firestore (Real-time).
- **AI**: Google Gemini API.
