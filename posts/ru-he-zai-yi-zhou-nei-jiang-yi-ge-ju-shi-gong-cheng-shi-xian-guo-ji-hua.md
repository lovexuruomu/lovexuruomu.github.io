<!--
.. title: 如何在一周内将一个巨石工程实现国际化
.. slug: ru-he-zai-yi-zhou-nei-jiang-yi-ge-ju-shi-gong-cheng-shi-xian-guo-ji-hua
.. date: 2026-10-30 09:59:51 UTC+08:00
.. tags: 
.. category: 技术
.. link: 
.. description: 
.. type: text
-->

故事开始之前，先抛四个问题。放心，这里只提问，不剧透答案：

1. 为什么语言包里有一条词条，渲染出来是「请输入 $张三」？那个多出来的 `$` 是谁的，为什么一直没人领？
2. 为什么有人只是想验证一下「提取脚本跑两遍，结果应该一模一样」，第二天打开仓库——802 个文件被改，4279 条新词条躺在语言包里，其中还埋着两条把业务逻辑吞掉的尸体？
3. 为什么一个只有 8 位字符的 hash（`1nmuo6rh`）差点被当垃圾删除，而它背后站着三个还在服役的页面？
4. 为什么「切换语言」这种看起来一行代码的事，最后的正式方案是「刷新整个页面」？

四个问题背后是四类事故，四类事故背后是同一个真相
<!-- TEASER_END -->

# i18n 迁移纪实：一个 hash 一条命

> 目标：Naraku 六个前端子应用、2103 个含中文的源文件，全量 hash-key 国际化。
> 本文记录迁移过程中最惊心动魄的事故与完整迁移方案。所有数字、hash、命令均可考。

---

## 引子 · 先讲四个鬼故事

故事开始之前，先抛四个问题。放心，这里只提问，不剧透答案：

1. 为什么语言包里有一条词条，渲染出来是「请输入 $张三」？那个多出来的 `$` 是谁的，为什么一直没人领？
2. 为什么有人只是想验证一下「提取脚本跑两遍，结果应该一模一样」，第二天打开仓库——802 个文件被改，4279 条新词条躺在语言包里，其中还埋着两条把业务逻辑吞掉的尸体？
3. 为什么一个只有 8 位字符的 hash（`1nmuo6rh`）差点被当垃圾删除，而它背后站着三个还在服役的页面？
4. 为什么「切换语言」这种看起来一行代码的事，最后的正式方案是「刷新整个页面」？

四个问题背后是四类事故，四类事故背后是同一个真相：**在 2103 个文件的规模上，没有小改动。**

### 而在事故之前：这个项目是怎么试错过来的

Naraku 的 i18n 方案不是一天定稿的。往回翻，几乎每个环节都撞过墙：

**第一次试错：key 叫什么名？**
传统 i18n 是语义 key（`module.feature.item`）。2103 个文件、数万条文案，光起名就能起死人，还要一份「key 命名规范」压着所有人。最后选了 hash 作 key——同文自动同 key，去重免费，AI 批量翻译可行。代价是 key 不可人肉计算，于是整个范式倒过来：开发者继续写中文，hash、语言包、替换全部交给脚本。
评价一下我这个前端工程的国际化突击工作
**第二次试错：语言包放哪、什么形态？**
先试共享包 `packages/shared-i18n/`——六个 app 各发各的包，共享包意味着跨仓库耦合与发版地狱，废弃。改「语言包按工程自维护 + 构建时虚拟模块沿 rsbuild 继承链聚合」。语言包形态试了三版：TS 模块（i18n Ally 的 TS 解析器依赖 ts-node，机器上没有，死）→ 带 ctx/file 元数据的 JSON（元数据是迁移期噪声，发包污染，瘦身）→ 裸映射 `{ hash: text }`，Ally 预览与运行时共用一份，零中间产物。

**第三次试错：`$t()` 的返回类型。**
vue-i18n 8 的 `$t` 返回 `TranslateResult`，`new Error($t(...))` 直接类型报错。让它返回 string，试了四条路：手动 `.toString()`（257 处噪音，一漏就炸）→ patch node_modules（yarn 重装即失效）→ declare module 覆盖（TS 3.7 报 TS2717、4.3 报 TS2300，双双冲突）→ 最终 tsconfig paths 拦截 + 影子类型文件。只此一条走通。

**第四次试错：切语言怎么生效。**
模块级 `$t()` 快照有 504 处，字符串不可变。Proxy 活值（`===` 恒 false，第三方 prop 全破坏）→ 快照注册表（改不了已返回的字符串）→ 模块热重载（生产不可行），三个方案全部阵亡，「整页刷新」收场。

**第五次试错：翻译文本溜进了协议值。**
参数页筛选选项被提取成 `value: $t('mTJVHNWx')`——翻译文本混进了 v-model 状态值。一路查到 git 里才发现原文的 value 本来就是中文。这类「协议值污染」前前后后揪出好几处，从此成了每次审查的必查项。

四个鬼故事的答案，正文里都有。以及那句整个迁移期间被问了无数遍的话：

> **「这个 hash，到底是从哪一行、哪个字面量、怎么变成现在这样的？」**

---

## 目录

- [第一部分 · 迁移方案全景](#第一部分--迁移方案全景)
- [第二部分 · 事故纪实（爽文正片）](#第二部分--事故纪实爽文正片)
  - [第一幕 被吞掉的三元表达式](#第一幕-被吞掉的三元表达式)
  - [第二幕 修一个 Bug，炸出三个](#第二幕-修一个-bug炸出三个)
  - [第三幕 一次手滑，全量爆炸](#第三幕-一次手滑全量爆炸)
  - [第四幕 切语言，一场死局](#第四幕-切语言一场死局)
  - [第五幕 那些差点翻车的小细节](#第五幕-那些差点翻车的小细节)
- [第三部分 · 方案细节附录](#第三部分--方案细节附录)

---

# 第一部分 · 迁移方案全景

## 1.1 核心范式：source-text 提取模式

不是传统「手写语义 key」的 i18n，而是**用 hash 代替原文作 key**：

```
hash = md5(text.trim()).base64url.slice(0, 8)
```

- 中文原文 → 8 位短 hash → `$t(hash, params?)`
- 同文同 key：相同文本自动得到相同 hash，跨工程天然去重
- 开发者行为近似「继续写中文」：新增文案直接写中文字面量，提交前跑提取脚本，hash 与语言包全部自动生成
- 语言包为**裸字符串映射**：`{ "a3f2b1": "状态" }`，vue-i18n 直接消费

## 1.2 术语

- **魔法字符串（Magic String）**：完整、独立、无变量拼接、无 HTML 结构、无跨行断开的字符串字面量。只有它才能被 AST 安全替换成 `$t(hash)`。
- **硬骨头（Hard Cases）**：不能直接自动化提取的模式——相邻拼接（`a + '个' + b`）、HTML 模板串内嵌中文、跨行字符串、`console.log('中文')`、函数直传中文字面量、枚举字典 value 等。

## 1.3 阶段路线

| 阶段 | 目标 | 状态 |
|------|------|------|
| P-1 | 项目摸底 & 规模统计（2103 文件） | ✔ 完成 |
| P0 | 硬骨头预处理 → 魔法字符串 | ✔ 完成（6 应用） |
| P1 | vue-i18n@8 + Element locale 桥接 + 虚拟聚合模块 | ✔ 完成 |
| P2 | TypeScript 类型补全（$t 注入 + 模块级导出） | ✔ 完成 |
| P3 | AST 提取脚本 | ✔ 完成（infra 试点） |
| P3+ | 工具化（tools/imigrate）、语言切换组件、zh-TW opencc | ✔ 完成 |
| P4 | 主线交付：infra → x → k | 进行中 |
| P5 | 支线铺开：vhe → ump → xd | 未开始 |
| P6 | AI 批量翻译（glossary 一致性流水线） | 每 app 完成即触发 |
| P7 | CI 卡点：禁止新增硬编码中文 | 未开始 |
| P8 | 枚举字典中文 | 挂起 |

**迁移顺序**：主线 `frontend-infra → frontend-x → frontend-k` 优先跑通；支线 `vhe → ump → xd` 排后。

## 1.4 架构：语言包按工程自维护 + 构建时虚拟聚合

- 每工程独立发包，语言包跟工程走：`apps/*/src/i18n/lang/{zh-CN,zh-TW,en-US,...}.json`
- **zh-CN**：extract 自动维护（增量扫描 → hash → 源码替换 → 条目落盘）
- **zh-TW**：extract 自动生成（opencc 简繁转换）
- **en-US**：人工/AI 逐条翻译补齐（extract 不管）
- **构建时聚合**：所有工程构建继承 `frontend-infra/rsbuild.config.ts`，在 `rsbuild.virtuals.ts` 以 `process.cwd()` 识别当前工程、沿继承链静态推导父链、按「父底层、子顶层」合并语言包 JSON，经 `VirtualModulesPlugin` 注入虚拟模块 `&/i18n/virtual-locales.ts`。产物自包含，无运行时文件查找
- i18n 实例工厂 `&/i18n/index.ts` 导出 `createI18n()`；Element UI 通过 `Vue.use(ElementUI, { i18n })` 桥接

## 1.5 关键决策记录（浓缩版）

| # | 决策 | 一句话理由 |
|---|------|-----------|
| 1 | hash 作 key（非语义化 key） | 同文自动去重、无需人工命名、可批量 |
| 2/7 | 枚举值即协议一律不动；展示层 Enum2 | 协议与展示分离 |
| 3 | `console.log('中文')` 改英文 | 调试信息不面向用户 |
| 4 | HTML 模板串语义单元完整则整串作 value | 拆 label 丢上下文、翻译易错 |
| 5 | 语言包按工程 + 虚拟聚合 | 独立发包需产物自包含 |
| 6 | 迁移后范式 = source-text 提取 | hash 不可人肉计算，工具链全托管 |
| 8 | **切语言整页刷新** | 504 处模块级快照字符串不可变，刷新重算最稳 |
| 9 | `$t()` 返回 TranslateResult 收窄为 string | 传 string API 免 `.toString()` 噪音 |

## 1.6 日常开发范式（迁移完成后）

1. **写代码 = 写中文**：直接写完整语义单元 + 具名变量，不手写 key
2. **提交前跑提取**：`yarn i18n:extract --app <app>`——增量扫描 → 生成 hash → 源码替换 → 写入 zh-CN.json 并自动同步 zh-TW.json（幂等可反复执行）
3. **操作快照与回滚**：`--write` 落盘前自动生成快照 `tools/imigrate/dist/operations/<时间戳>-extract/`（backup 源文件 + 三语言包）；`node tools/imigrate/src/cli.mjs revert <批次目录>` 无 git 辅助也能回滚
4. **迁移报告**：每次提取落盘结构化报告；`yarn i18n:report` 生成浏览器可预览 HTML
5. **编辑器预览**：语言包 JSON 即 i18n Ally 预览源（`apps/*/src/i18n/lang` glob 自动生效）
6. **CI 卡点（P7）**：禁止提交未注册中文字面量（`// i18n-skip` 标注除外）

---

# 第二部分 · 事故纪实（爽文正片）

> 工具链是 `tools/imigrate`，脚本核心在 `src/extract.mjs`。每一幕都是真事，每一处 hash 都能在 git 里找到尸体。

## 第一幕 被吞掉的三元表达式

那天用户甩来一张截图，配一句话：

> 「这种错误也能犯吗，不是明显的三元表达式吗，看看其他地方是否都搞错了」

`async-task/index.vue` 第 15 行，提取产物长这样：

```html
{{ $t('imJvihau', {  }) }}
```

一个空参数对象的 `$t` 调用。而原文是：

```html
{{ (retryTime || 20) === currentRetryTime ? '请检查对应执行环境' : `正在执行第${currentRetryTime}次重连……` }}
```

**一整段三元表达式，连 `{{ }}` 外壳带模板串，被当成一段静态文本提取成了单条词条。** 运行时这个节点只会渲染语言包里的中文原文——重连状态判断逻辑灰飞烟灭，用户看到的就是死文字。

### 排查：把正则挖出来枪毙

翻 `extract.mjs` 里处理模板文本节点的函数，罪魁祸首现形：

```js
const INTERP_RE = /\{\{([^{}]*)\}\}/g
```

秒懂。`[^{}]*` 不允许出现任何花括号——而模板串 `` `正在执行第${currentRetryTime}次重连……` `` 里的 `${}` 恰好就是花括号。正则匹配到 `${` 就断，整段 mustache 被判定「不含插值」，漏进静态文本提取分支，中文部分被整段 hash 化。

### 修复：深度感知扫描器

正则退场，手写 `findInterp()`：

```js
function findInterp(core, from) {
  for (;;) {
    const open = core.indexOf('{{', from)
    if (open === -1) return null
    let depth = 1
    let j = open + 2
    let inStr = null
    while (j < core.length && depth > 0) {
      const c = core[j]
      if (inStr) {
        if (c === inStr && core[j - 1] !== '\\') inStr = null
      } else if (c === '"' || c === "'" || c === '`') {
        inStr = c
      } else if (c === '{') depth++
      else if (c === '}') depth--
      j++
    }
    if (depth !== 0) return null
    if (core[j] === '}') j++ // 消费 }} 的第二个右花括号
    return { start: open, end: j, expr: core.slice(open + 2, j - 2) }
  }
}
```

字符串感知、反引号感知、嵌套花括号计数——一个不落。修完顺手全仓审计：语言包里躺着两条同样的尸体（`imJvihau`、`wYbm_ByM`），涉及 3 个源文件。拆尸重建：

| 损坏条目 | 拆分为 | 文本 |
|---|---|---|
| `imJvihau`（吞三元） | `gE8L9Vl7` | 请检查对应执行环境 |
| | `FTYpApg3` | 正在执行第{currentRetryTime}次重连…… |
| `wYbm_ByM`（吞三元） | `GPzxXm7Y` | 上传{uploadText} |
| | `YfPbn0Kh` | 选取文件 |

三个源文件恢复为「三元 + 具名参数 `$t`」的正确形态，zh-CN/zh-TW/en-US 三包同步重建。

## 第二幕 修一个 Bug，炸出三个

修掉正则，写探针文件验证。第一轮输出：

```
输入：状态 {{ a ? '运行中' : '已停止' }}
输出：状态 {{ $t('-CStrTp6', [a ? $t('1nmuo6rh') : $t('gpd4VGom')]) }}
```

漂亮。然后跑全量回归。噩梦开始，一次修 Bug 的连锁反应炸出三个新 Bug。

### Bug B：占位符原地不动，渲染出「$张三」

语言包里躺着这种条目：

```json
{ "_TUJxZ5j": "配置主机 ${hostname}" }
```

vue-i18n 8 实测渲染：`配置主机 $张三`。`${name}` 里的 `$` 被当成字面量输出，具名插值根本没生效。

根因在 `writeLangEntries` 的占位符转换正则——它把源码重建文本里的 `${expr}` 转成 vue-i18n 的 `{name}` 格式，但**只允许一层点号链**：

```js
/\$\{([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\}/g  // 修复后
```

`${this.row.hostname}` 是两层成员链（`this.row.hostname`），旧正则匹配失败，`${...}` 原样落进语言包。而调用点传的是命名参数 `{ hostname: ... }`——vue-i18n 里 `${hostname}` 不是合法占位符，直接吐字面量。

全仓排查：zh-CN/zh-TW 各 **258 条** `${name}` 污染。批改脚本重写，四条典型（`56JjzF5M`、`LcQOkjC6`、`_TUJxZ5j`、`p2VrRxBl`）手工核验。

### Bug C：偏移偏移，手术刀砍偏

探针产物出现乱码：

```
?$t('gE8L9Vl7')l7')
```

根因：插值子编辑的偏移按 `trim()` 后的表达式计算，平移回原文坐标系时**没回补前导空格**。`{{ expr }}` 里 expr 带前导空格时，所有替换位置整体左偏一个字符——手术刀砍在 `$t(` 前一个字符上，产物成了尸体。修复：记录 `exprLead`（trim 掉的前导空格数），所有子编辑偏移统一回补。

### Bug D：最阴的一个——同归于尽

纯 mustache 三元表达式**压根没被替换**。不是没检测到，而是检测到了两次：

1. 静态文本收集器的子编辑产出一组编辑（处理 `{{ a ? '运行中' : '已停止' }}`）
2. 插值收集器对同一区间又产出一组编辑

两组编辑**区间完全相同**。`applyEdits` 的覆盖过滤规则本意是去重——「完全覆盖」的编辑丢弃。但两组互相完全覆盖，结果**双双被丢弃**。规则本意是去重，实际效果是同归于尽。

修复：静态文本收集器返回 `mustacheRanges`（已处理插值区间），插值收集器据此跳过——一个区间只允许一个主人。

四个 Bug 排完已经是深夜。但真正刺激的还在后面。

## 第三幕 一次手滑，全量爆炸

那天我只是想验证提取的幂等性，习惯性敲下 `--write`。

提取脚本认真地干起了 P4 全量提取：**11542 个替换点、4279 条新条目、802 个文件**，六亲不认，一次落盘。

更致命的是：此前会话辛辛苦苦提取的 login 18 条 + license-modal 15 条成果，**从未提交过 git**。回滚命令 `git checkout -- src` 执行的那一刻，它们跟着全量误提取一起消失在历史里——git 只能回到 HEAD，回不到「刚才」。

那晚的修复流程：

1. `git checkout -- src` 回滚源码
2. 意识到成果丢失，接受现实，重跑 `extract --files login.vue`（18 条）+ `--files license-modal.vue`（17 条，新能力多 2 条，共 **35 条**）重建 zh-CN/zh-TW
3. en-US 35 条重译
4. **从此诞生操作快照机制**：每次 `--write` 落盘前，自动备份被改源文件 + 三语言包到 `tools/imigrate/dist/operations/<时间戳>-extract/`（manifest.json + backup），`revert <批次目录>` 一键回滚。无 git 辅助也能活。

验证方式也定型了：快照 → 提取 → revert → md5 对比源文件与语言包完全一致、git status 还原干净。

## 第四幕 切语言，一场死局

上线语言切换组件时，撞上一个哲学级问题：**504 处模块级 `$t()` 快照**（334 个 classProp + 170 个 moduleConst）。

```ts
public hostLocalArr = [
  { name: 'lunName', label: $t('uy3B5i6W'), desc: '' },  // 模块加载时求值一次
]
```

JS 字符串不可变。切语言后，这些已求值的字符串**不可能事后改写**。排查会上否掉了三个方案：

| 方案 | 死因 |
|---|---|
| `$t` 返回 Proxy 活值 | `===` 比较恒 false，JSON 序列化/字符串方法/第三方 prop 行为全破坏，TS 契约从 string 变对象 |
| 快照注册表 + 切语言改写已返回字符串 | 字符串不可变，无法事后改写 |
| 切语言时模块热重载 | 生产环境不可行 |

最终决策（决策 8）：**切语言整页刷新**。`changeLocale → setLocale → location.reload()`。刷新后模块重载，快照按新语言重算，一处改动全局正确。切换入口只在登录页，无业务状态可丢。简单粗暴，但这是被字符串不可变性逼出来的最优解。

代价是明确的：快照类调用（504 处）成为「已知取舍」，`label-risky-audit.json` 作为远期改造清单沉淀（getter 化 / 工厂函数 / hash 下沉三条路径）。

## 第五幕 那些差点翻车的小细节

### 5.1 得分「分」被译成 min

仪表盘上的得分单位"分"（`2veDyM35`），en-US 被译成 **"min"**——翻译者当成了时分秒的分。溯源（trace）显示它唯一来源是 `echart/score.vue` 得分仪表盘；时间语境的"分"都是独立条目（`Ohe3NS5x`="分钟"→min、`v_el0iRN`="{hours} 时 {minutes} 分"→"{hours} h {minutes} min"），无 hash 冲突。一行 en-US 修正：`"min" → "pts"`。教训：**glossary 不得建立全局「分 → min」词条，多义词必须按溯源位置分组翻译**。

### 5.2 英语单复数：$tc 双段管道落地

`已选中: {num}条` 的 en-US 是 "Selected: {num} items"——选中 1 条也显示 items。

方案：vue-i18n 8 原生 `$tc(key, choice, values)` + 双段管道消息 `"item | items"`。node 直跑 vue-i18n 8.28.2 实测：

```
en-US tc(1)  → "Selected: 1 item"      // choice=1 → 第一段
en-US tc(0)  → "Selected: 0 items"     // choice=0 → 第二段
en-US tc(5)  → "Selected: 5 items"
en-US tc(-3) → "Selected: -3 items"
zh-CN tc(1)  → "已选中: 1条"            // 单形态消息安全回退
```

6 个可数条目 en-US 管道化 + 调用点 `$t`→`$tc`；`&/i18n` 新增模块级 `$tc`；同时修掉 extract 的一个缺陷——**模板文本节点插值路径恒写 `plural: false`**，可数条目漏标复数元数据。修复后按 `PLURAL_VAR_RE`（count/total/n/num/size/length/amount/qty/days/hours/minutes/seconds）启发式标记。

### 5.3 探针污染：差点手起刀落误删真身

清理探针文件留下的语言包污染时，名单上有 `1nmuo6rh`（"运行中"）。手起刀落前 grep 一查——**3 个真实文件在引用它**（op-status.vue、top-task.vue、list-view.vue）。探针恰好用了同样的中文字面量「运行中」，hash 与真身相同。删前必须验尸：grep 源码引用，零引用才可删。同批清理的 4 条真垃圾（`-CStrTp6`、`gpd4VGom`、`0iwn7fLd`、`IIBAh9Ht`）从三语言包 + trace 溯源一并清除。

### 5.4 TS 语言包 → JSON：ts-node 之死

i18n Ally 预览死活不认 TS 语言包。源码实证：Ally 的 TS 解析器依赖 ts-node，机器上没有、不可移植——**JSON 是唯一正确选择**。而 fast-glob 加载目录不受 .gitignore 影响（此前「gitignore 导致加载为空」的结论作废）。语言包 JSON 化后单一数据源零中间产物：既是运行时语言包，又是 Ally 预览源。

### 5.5 根实例漏挂 i18n：$i18n 集体崩溃

只经 `Vue.use(VueI18n)` 注入原型 getter 是不够的——root 不传 i18n，全组件链 `_i18n` 为 undefined，`this.$i18n.locale` 直接抛 `Cannot read properties of undefined`。vue-i18n 8 的 mixin 继承依赖 `this.$root.$i18n`，root 是唯一入口。每个 app 的 main.ts 必须 `import { i18n } from '&/i18n'` 且 `new Vue({ ..., i18n })`。**smart-report 多页入口同样必须接入**——它是 MPA 第二 entry，报告页独立渲染，漏挂一样崩。

### 5.6 StringBoolean 的幽灵

`index.oracle.vue` 的 options 对象从旧 `StringBoolean` 枚举（`{ False: '否', True: '是' }`）换成新格式 `{ True: $t(...), False: $t(...), '是': $t(...), '否': $t(...) }`。查证：TS 字符串枚举运行时是**双向映射**（`{'否': 'False', '是': 'True'}` 反向键）——旧代码里中文输入会命反向映射，显示成 'True'/'False'（bug）。新格式主路径（后端存 'True'/'False'）行为一致，还顺手修掉了反向映射陷阱。结论：兼容，且新格式更对。

---

# 第三部分 · 方案细节附录

## 3.1 强制约定（所有贡献者必须遵守）

- **禁止**新增硬编码中文字面量（用户可见文案）；必须写成魔法字符串
- **禁止** `a + '中文' + b` 拼接，统一 `` `${a}中文${b}` ``（中文保持整段，变量占位不加引号）
- HTML 模板串：**整串是完整语义单元则可包含 HTML**（`` `<p>网速：${x}</p>` `` 一条 key），禁止拆 label 片段；渲染用 `v-html="$t(hash, params)"`
- 调试信息（`console.*`）一律英文，不参与 i18n
- 函数参数中文字面量：**会被下游二次加工的情形必须变量注入**（`createTip`/`$confirm + dangerouslyUseHTMLString`/含标签字符串 → 上提常量）；纯展示（`$notify`/`$message`/对象属性赋值）允许内联
- 变量插值统一 `` `${x}` `` 具名参数（`{x}`），禁用 `{0}` 位置参数
- 含可计数变量的模板串保持「整句 + 具名变量」，后期可套 ICU 复数
- `$tc`（管道）与 ICU 混用时同一条目只用一种机制

## 3.2 提取与替换

- hash：`md5(text.trim()).base64url.slice(0, 8)`，全项目共享一张 hash 表
- AST 提取：Vue SFC parser + babel/TS compiler，白名单 `apps/*/src/**/*.{vue,ts,tsx,js}`
- **排除目录**（任何阶段不得处理）：`mock/**`、`api-types/**`、`tests/**`、`public/**`、`node_modules/**`、`*.spec.ts`、`*.d.ts`
- 注释中的中文一律不参与 i18n
- 模板覆盖范围：插值表达式、**纯文本节点**（`<p>登录系统</p>` → `<p>{{ $t('hash') }}</p>`）、**展示型静态属性**（placeholder/title/alt/label 白名单）
- 语言包插值占位符必须是 vue-i18n 命名插值 `{name}`；hash 按源码 `${expr}` 形式计算（幂等不受影响）

## 3.3 翻译与运行时

- vue-i18n@8（Vue 2 匹配）；Element UI 通过 `Vue.use(ElementUI, { i18n })` 桥接
- 运行时 fallback 链 `当前语言 → zh-CN`，未翻译条目回显中文而非 hash
- 复数：`$tc(key, choice, values)` 双段管道（en-US 等）；中文单形态安全回退
- 语义六约：完整语义单元 / 语言包只含运行时字段（元数据进 trace）/ 具名参数 / 不预拆语序 / 复数预留 ICU / AI 翻译按溯源分组 + glossary 一致性

## 3.4 多页入口清单

- 每个 app 的 `main.ts`：`import { i18n } from '&/i18n'` + `new Vue({ ..., i18n })`
- infra 与 ump 的 `src/smart-report/main.ts`（MPA 第二 entry，由 `rsbuild.report.ts` 注入）：同样必须接入
- x/vhe 的 report.plugin 是运行时动态加载，无独立 entry，不需接入

## 3.5 工具链（tools/imigrate）

| 模块 | 职责 |
|---|---|
| `extract.mjs` | AST 提取：增量扫描 → hash → 源码替换 → zh-CN 落盘 + opencc 同步 zh-TW；快照先于一切写回 |
| `report.mjs` | 结构化报告落盘 `dist/reports/<app>.json` + HTML 汇总 |
| `serve.mjs` | 报告静态预览 |
| `snapshot.mjs` | `--write` 前快照 / `revert` 回滚 |
| `cli.mjs` | `yarn i18n:extract --app <app> [--files f1] [--write]` / `revert <批次目录>` |
| `zh-check.mjs` | 中文残留检查（CI 卡点配套） |

## 3.6 已知取舍与远期规划

- **504 处模块级快照**（334 classProp + 170 moduleConst）：切语言依赖整页刷新，清单见 `dist/label-risky-audit.json`
- 远期（应用内即时切换）：classProp → getter；moduleConst → 工厂函数或 hash 下沉；config.ts `databaseEnum` → hash 下沉；预研 `$tRef(key, values)` 响应式活值
- 枚举字典中文（P8）：挂起，等待业务侧决定 enum + 分离 label 还是运行时 `$t`

## 3.7 事故时间线速查

| 事故 | 根因 | 修复 | 防线 |
|---|---|---|---|
| 吞三元（imJvihau/wYbm_ByM） | `INTERP_RE` 正则 `[^{}]*` 遇 `${}` 断 | 深度扫描器 findInterp | 全仓语言包审计 + 探针回归 |
| 占位符 `$张三`（258 条） | 转换正则只一层点号链 | 多层链正则 | 批量重写 + 手工核验 4 条 |
| 偏移乱码 `?$t(...)l7')` | trim 后偏移未回补 | exprLead 补偿 | 探针全场景回归 |
| 重复编辑同归于尽 | applyEdits 覆盖过滤误杀 | mustacheRanges 区间归属 | 幂等验证 |
| 全量误提取（11542 点） | 幂等验证误用 --write | 重跑重建 35 条 | **操作快照 + revert** |
| 504 处快照死局 | 字符串不可变 | 整页刷新（决策 8） | label-risky-audit 清单 |
| 得分"分"→min | 多义词无上下文翻译 | en-US 修正 pts | 溯源分组 + glossary 约束 |
| 单复数缺失 | $t 无复数能力 + 2a 路径漏标 | $tc 双段管道 + plural 启发式 | trace plural 元数据 |
| 探针污染误删风险 | 探针与真身同 hash | 删前 grep 验尸 | 零引用才可删 |
| $i18n 崩溃 | root 未传 i18n | main.ts/smart-report 全接入 | build + Browser 双验证 |

---

*本文所有数字均可考：2103 源文件、11542 替换点、4279 条目、802 文件、504 快照、258 占位符污染、4 个脚本 Bug、8 位 hash、35 条首批 en-US。*

