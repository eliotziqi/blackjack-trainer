# Blackjack Trainer Pro

一个专注于 21 点基本策略训练的 Web 应用，帮助用户通过系统化练习掌握最优决策。

## ✨ 核心功能

### 1. 规则配置 (Rules)
- 支持自定义牌桌规则：牌副数、Dealer Hit S17、DAS、Surrender 等
- 规则快照机制：确保单次训练会话规则一致性

### 2. 策略记忆 (Strategy)
- 可视化基本策略表格（Hard、Soft、Pairs）
- 悬停显示策略解释
- 支持不同规则下策略自动适配

### 3. 场景理解 (Scenario)
- 随机生成训练场景
- 实时显示所有可选动作的期望值（EV）
- AI 生成的策略解释（纯本地算法，无需 API）

### 4. 无提示练习 (Practice)
- 模拟真实决策场景
- 即时反馈：正确/错误及详细解释
- 统计正确率和响应时间

### 5. 连续模拟 (Simulation)
- 完整的 Blackjack 游戏流程模拟
- 资金管理与波动追踪
- 测试策略在连续场景下的稳定性

### 6. 数据统计 (Stats)
- 按手牌类型统计正确率
- 记录错误决策模式
- 帮助定位薄弱点

## 🚀 快速开始

### 环境要求
- Node.js >= 16
- npm 或 pnpm

### 安装与运行

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev

# 3. 构建生产版本
npm run build

# 4. 预览生产构建
npm run preview
```

### 项目结构

```
blackjack-trainer/
├── TODO.md                  # 主 TODO 列表
├── components/              # React 组件
│   ├── ActionControls.tsx       # 动作按钮组件
│   ├── Card.tsx                 # 扑克牌组件
│   ├── StrategyGrid.tsx         # 策略表格组件
│   │
│   ├── icons/                   # 图标组件
│   │   └── index.tsx            # SVG 图标集合
│   │
│   └── ui/                      # 通用 UI 组件
│       ├── NavButton.tsx        # 底部导航按钮
│       ├── RuleToggle.tsx       # 规则开关组件
│       └── StatCard.tsx         # 统计卡片组件
│
├── views/                   # 页面视图组件
│   ├── RulesView.tsx            # 规则配置页面
│   ├── StrategyView.tsx         # 策略表格页面
│   ├── PracticeView.tsx         # 练习模式页面
│   ├── ScenarioView.tsx         # 场景分析页面
│   ├── SimulationView.tsx       # 游戏模拟页面
│   └── StatsView.tsx            # 统计数据页面
│
├── services/                # 业务逻辑
│   ├── blackjackLogic.ts        # 游戏核心逻辑
│   ├── strategyEngine.ts        # 基本策略引擎
│   ├── evCalculator.ts          # 期望值计算器
│   └── statsService.ts          # 统计数据管理
│
├── App.tsx                  # 主应用（路由 + 布局）
├── types.ts                 # TypeScript 类型定义
├── index.tsx                # 应用入口
├── index.html               # HTML 模板
├── vite.config.ts           # Vite 配置
├── tsconfig.json            # TypeScript 配置
├── package.json             # 项目配置
├── PRD_zh.md                # 产品需求文档
└── README.md                # 项目文档

```

## 📚 核心模块说明

### 策略引擎 (`services/strategyEngine.ts`)
- 实现完整的基本策略决策树
- 支持 Hard、Soft、Pairs 三种手牌类型
- 根据规则动态调整策略（如 H17/S17、DAS、Surrender）

### EV 计算器 (`services/evCalculator.ts`)
- 使用蒙特卡洛方法模拟大量游戏场景
- 计算每个动作的期望值（Hit、Stand、Double、Split、Surrender）
- 性能优化：默认 10,000 次模拟，可配置

### 统计服务 (`services/statsService.ts`)
- 本地持久化练习数据（localStorage）
- 按手牌类型分类统计
- 支持数据清除和导出

## 🔧 开发指南

### 添加新功能页面
1. 在 `views/` 目录创建新的视图组件
2. 在 `types.ts` 中添加新的 `ViewMode` 枚举值
3. 在 `App.tsx` 中导入并添加路由
4. 在底部导航栏添加按钮

### 修改现有页面
- **规则配置**: 编辑 `views/RulesView.tsx`
- **策略表格**: 编辑 `views/StrategyView.tsx`
- **练习模式**: 编辑 `views/PracticeView.tsx`
- **场景分析**: 编辑 `views/ScenarioView.tsx`
- **游戏模拟**: 编辑 `views/SimulationView.tsx`
- **统计数据**: 编辑 `views/StatsView.tsx`

### 添加新规则
1. 在 `types.ts` 的 `GameRules` 接口中添加新字段
2. 在 `services/strategyEngine.ts` 中更新策略逻辑
3. 在 `views/RulesView.tsx` 添加配置控制项

### 自定义 UI 组件
- **创建新组件**: 在 `components/ui/` 目录创建
- **修改现有组件**: 编辑对应的 `.tsx` 文件
- **样式调整**: 使用 Tailwind CSS 类名

### 调整核心逻辑
- **策略算法**: `services/strategyEngine.ts`
- **EV 计算**: `services/evCalculator.ts`（修改 `SIMULATION_ROUNDS` 调整精度）
- **统计服务**: `services/statsService.ts`

### 代码规范
- ✅ 使用 TypeScript 强类型
- ✅ 组件使用 React Hooks
- ✅ Props 定义 interface
- ✅ 业务逻辑与 UI 分离
- ✅ 单一职责原则

## 📝 开发日志

### 2025-12-29
- ✅ 完成项目重构：将 774 行的 App.tsx 拆分为模块化结构
- ✅ 创建 `views/` 目录，6 个页面组件独立管理
- ✅ 创建 `components/ui/` 和 `components/icons/` 目录
- ✅ 实现 Practice 模式交互锁机制，防止重复点击
- ✅ 清理代码，App.tsx 从 774 行减少到 84 行（↓ 89%）
- ✅ 移除 Gemini API 依赖，策略解释完全本地化

### 待办事项

**高优先级 (P0)**
- [ ] Practice 模式 UI 改进：按钮布局优化
- [ ] 添加连胜 Streak 显示
- [ ] 优化 Dealer/Player 区域间距

**中优先级 (P1)**
- [ ] 添加按钮点击动画和过渡效果
- [ ] 实现收牌动画（模拟 Dealer 收牌）
- [ ] 错误时显示 EV 对比信息

**低优先级 (P2)**
- [ ] 添加卡牌计数训练模式
- [ ] 支持多人游戏场景模拟
- [ ] 导出练习数据为 CSV
- [ ] 添加语音提示功能
- [ ] 移动端适配优化

## 🔗 相关资源

- [Blackjack Basic Strategy (维基百科)](https://en.wikipedia.org/wiki/Blackjack)
- [Expected Value 计算原理](https://wizardofodds.com/games/blackjack/)