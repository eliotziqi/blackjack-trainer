# Blackjack Trainer Pro - TODO

> 最后更新：2025-12-29

## 🔥 进行中 (In Progress)

### Practice 模式 UI/UX 改进
- [x] P0: 交互锁机制（防止重复点击）
- [ ] P0-1: 按钮布局重构（两排设计）
- [ ] P0-2: Dealer/Player 区域间距优化
- [ ] P1-1: 按钮点击动画过渡
- [ ] P1-2: 收牌动画（模拟 Dealer 收牌）
- [ ] P2-1: 连胜 Streak 显示
- [ ] P2-2: 手牌统计快速预览
- [ ] P2-3: 错误时显示 EV 对比

---

## ⚠️ 重构后发现的问题
### 功能完整性
- [ ] 🟢 低：StatsView 未导入 `clearStats` 的实际使用
  - **位置**: `views/StatsView.tsx`
  - **现象**: 导入了 `clearStats` 但 `onReset` 由父组件 `App.tsx` 处理
  - **影响**: 无，功能正常但导入冗余
  - **建议**: 清理未使用的导入以保持代码整洁

### 代码规范
- [ ] 🟢 低：缺少 TypeScript 严格模式检查
  - **影响**: 可能存在潜在的类型安全问题
  - **建议**: 在 `tsconfig.json` 中启用 `strict: true`

---

## 📌 待办 (Backlog)

### 高优先级 (P0)
- [ ] 移动端响应式布局优化
- [ ] 修复 Split 按钮不可用时的禁用状态
- [ ] 添加键盘快捷键支持（H/S/D/P/R）

### 中优先级 (P1)
- [ ] 添加音效（正确/错误/发牌）
- [ ] 实现暗黑/明亮主题切换
- [ ] 添加进度保存（LocalStorage）
- [ ] 优化 EV 计算性能（Web Worker）

### 低优先级 (P2)
- [ ] 卡牌计数训练模式
- [ ] 多人游戏场景模拟
- [ ] 导出练习数据为 CSV
- [ ] 添加语音提示功能
- [ ] 支持自定义训练场景

---

## ✅ 已完成 (Done)

### 2025-12-29
- [x] 项目重构：App.tsx 从 774 行优化到 84 行
- [x] 创建 views/ 目录结构
- [x] 创建 components/ui/ 和 components/icons/
- [x] 移除 Gemini API 依赖
- [x] 实现策略解释本地化
- [x] 更新 README.md 文档

---

## 🐛 Bug 修复

- [ ] 🔴 高：Split 后的手牌计算错误
- [ ] 🟡 中：Stats 页面 "Reset Statistics" 按钮点击无响应
  - **位置**: `views/StatsView.tsx`
  - **现象**: 按钮点击后没有清空统计数据
  - **影响**: 用户无法重置训练记录
  - **临时方案**: 手动清除 localStorage
- [ ] 🟡 中：Dealer A 时 Surrender 逻辑不准确
- [ ] 🟢 低：统计页面的百分比显示精度问题

---

## 💡 想法池 (Ideas)

- 💭 添加"每日挑战"模式
- 💭 集成真实赌场规则库（Las Vegas/Macau）
- 💭 实现社交分享功能
- 💭 添加成就系统（徽章）
- 💭 支持多语言（中文/英文切换）

---

## 📝 笔记 (Notes)

### 技术债务
- 需要为 SimulationView 添加单元测试
- evCalculator 的蒙特卡洛模拟可以优化算法
- 考虑使用 Zustand 替代多个 useState

### 性能优化
- Card 组件可以使用 React.memo
- StrategyGrid 可以虚拟滚动优化大表格

---

## 🎯 里程碑 (Milestones)

### v1.0 - MVP 完成 ✅
- [x] 基础功能实现
- [x] 6 个页面模块完成
- [x] 代码重构

### v1.1 - Practice 模式优化 (当前)
- [ ] UI/UX 改进（7/8 完成）
- [ ] 交互动画
- [ ] 反馈增强

### v1.2 - 性能与体验
- [ ] 移动端适配
- [ ] 音效支持
- [ ] 键盘快捷键

### v2.0 - 高级功能
- [ ] 卡牌计数模式
- [ ] 社交功能
- [ ] 成就系统