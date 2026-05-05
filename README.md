# FocusFlow

一个基于番茄工作法的桌面应用，帮助您提高专注力和工作效率。

## 项目介绍

FocusFlow 是一款现代化的番茄钟应用，结合了任务管理和数据统计功能，帮助用户更好地管理时间和提高生产力。

### 核心特性

- ⏱️ **番茄钟计时**: 支持自定义专注和休息时长
- 📋 **任务管理**: 创建、跟踪和完成任务
- 📊 **数据统计**: 实时查看专注数据和完成情况
- 🌙 **深色模式**: 支持明暗主题切换
- 🔐 **数据加密**: 本地数据加密存储
- 🔔 **系统通知**: 完成番茄钟时发送通知

## 技术架构

### 技术栈

| 分类 | 技术 | 版本 |
|------|------|------|
| 前端框架 | Next.js | 15.5.15 |
| UI 框架 | React | 19.2.5 |
| 语言 | TypeScript | - |
| 样式 | Tailwind CSS | 3.4.19 |
| 状态管理 | Zustand | 4.5.7 |
| 动画 | Framer Motion | 11.18.2 |
| 图标 | Lucide React | 0.360.0 |
| 桌面框架 | Tauri | 2.10.1 |

### 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      FocusFlow 应用                          │
├─────────────────────────────────────────────────────────────┤
│  UI Layer                                                   │
│  ├── Components (Navbar, Timer, ThemeToggle, SettingsPanel) │
│  └── Pages (Home, Tasks, Stats, Settings)                   │
├─────────────────────────────────────────────────────────────┤
│  Business Logic Layer                                       │
│  ├── Hooks (useTimer)                                       │
│  └── Store (TimerStore, TaskStore, ThemeStore)              │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                 │
│  ├── IndexedDB (加密存储)                                    │
│  └── Tauri API (通知、系统托盘)                              │
└─────────────────────────────────────────────────────────────┘
```

### 目录结构

```
src/
├── app/                    # Next.js 应用路由
│   ├── layout.tsx          # 根布局
│   ├── page.tsx            # 首页（计时器）
│   ├── tasks/              # 任务管理页面
│   ├── stats/              # 数据统计页面
│   └── settings/           # 设置页面
├── components/             # 组件
│   ├── ui/                 # UI 基础组件
│   │   ├── Button.tsx
│   │   └── Card.tsx
│   ├── Navbar.tsx          # 导航栏
│   ├── Timer.tsx           # 计时器组件
│   ├── ThemeToggle.tsx     # 主题切换
│   └── SettingsPanel.tsx   # 设置面板
├── hooks/                  # 自定义 Hooks
│   └── useTimer.ts         # 计时器 Hook
├── lib/                    # 工具库
│   ├── store.ts            # Zustand 状态管理
│   └── utils.ts            # 工具函数
└── styles/                 # 样式文件
    ├── globals.css         # 全局样式
    └── css.d.ts            # CSS 类型定义
```

### 核心模块说明

**1. 状态管理 (src/lib/store.ts)**

- **TimerStore**: 管理计时器状态（运行状态、剩余时间、模式切换、统计数据）
- **TaskStore**: 管理任务列表（添加、完成、删除、导出）
- **ThemeStore**: 管理主题状态（明暗模式切换）

**2. 数据持久化**

使用 IndexedDB 结合 AES-GCM 加密算法进行本地数据存储，确保用户数据安全。

**3. Tauri 集成**

- 系统通知：完成番茄钟时发送桌面通知
- 系统托盘：显示倒计时状态

## 功能设计

### 计时器功能

| 功能 | 描述 |
|------|------|
| 开始/暂停 | 控制计时器运行状态 |
| 重置 | 重置当前计时 |
| 模式切换 | 在专注和休息模式间切换 |
| 自定义时长 | 支持自定义专注（1-120分钟）和休息（1-60分钟）时长 |

### 任务管理

| 功能 | 描述 |
|------|------|
| 添加任务 | 创建新任务，设置目标番茄钟数量 |
| 完成任务 | 标记任务完成，可更新实际用时 |
| 删除任务 | 移除不需要的任务 |
| 任务导出 | 支持按状态和时间筛选导出 Markdown 格式 |

### 数据统计

| 统计项 | 描述 |
|--------|------|
| 今日完成 | 当天完成的番茄钟数量 |
| 本周统计 | 本周每日完成情况柱状图 |
| 总专注时间 | 累计专注时长 |
| 累计完成 | 总番茄钟完成数量 |

## 快速开始

### 前置要求

- Node.js >= 18.17.0
- pnpm >= 8.0.0
- Rust (用于 Tauri 构建)

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
# Web 开发
pnpm run dev

# Tauri 桌面开发
pnpm run tauri dev
```

### 构建

```bash
# Web 构建
pnpm run build

# Tauri 桌面构建
pnpm run tauri build
```

### 运行测试

```bash
pnpm run lint
```

## 运维打包

### Tauri 打包配置

项目使用 Tauri 2 进行桌面应用打包，配置文件位于 `src-tauri/tauri.conf.json`。

**打包命令**:

```bash
# 构建所有目标平台
pnpm run tauri build
```

**输出目录**:

打包产物位于 `src-tauri/target/release/bundle/`，包含：
- Windows: `.msi` `.exe` 安装包

### 配置说明

| 配置项 | 说明 |
|--------|------|
| productName | 应用名称 |
| version | 版本号 |
| identifier | 应用标识符 |
| build.frontendDist | 前端构建产物目录 |
| app.windows | 窗口配置（尺寸、标题等） |
| bundle.targets | 目标平台 |

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 联系方式

如有问题或建议，请通过以下方式联系：
- 提交 GitHub Issue
- 发送邮件至开发者邮箱