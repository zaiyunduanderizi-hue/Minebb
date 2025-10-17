# UI Finance Contract (v0.1)

## Timeseries & Candle expectations
- K 线数据通过 `Timeseries<Candle>` 结构传入，包含代码、市场、周期、点位数组与扩展元数据。字段在 UI 中按以下语义使用：
  - `symbol`: 证券代码（不含交易所后缀），与 `market` 一起确定唯一标的。 【F:apps/terminal/common/finance/types.ts†L1-L17】
  - `market`: 取值 `CN`/`HK`，用于决定行情市场与价格货币。
  - `timeframe`: 目前支持 `1d`、`1w`、`1m`，单位分别为交易日、交易周、交易月。
  - `points`: 排序好的蜡烛点列表，每个点含 `t`（Unix 毫秒时间戳）、`o/h/l/c`（开收高低价，单位：市场本币）、`v`（可选成交量，单位：股/手）。 【F:apps/terminal/common/finance/types.ts†L5-L17】【F:apps/terminal/test/fixtures/lixinger/candles.600036.SH.1d.json†L6-L24】
- UI 需要原样渲染 K 线（Lightweight Charts 接受秒级时间戳，因此在渲染前会转换为秒）。空数组会触发“暂无 K 线数据”占位。 【F:apps/terminal/src/panels/KLinePanel.tsx†L137-L174】【F:apps/terminal/src/panels/KLinePanel.tsx†L226-L234】

## Quote expectations
- 报价使用 `Quote` 对象，字段包括实时价格、涨跌额/幅、时间戳（毫秒）、货币。UI 在顶部徽章中显示价格与涨跌幅。缺失或加载失败时显示提示。 【F:apps/terminal/common/finance/types.ts†L19-L26】【F:apps/terminal/test/fixtures/lixinger/quote.600036.SH.json†L3-L13】【F:apps/terminal/src/panels/KLinePanel.tsx†L205-L223】

## IPC response & metadata
- 前端通过 `window.lx.fetch` 访问 IPC，返回值包含 `data` 与 `meta`。`meta` 提供缓存命中状态、TTL（秒）与数据来源标记，用于徽章与倒计时。 【F:apps/terminal/common/ipc/dto.ts†L21-L39】【F:apps/terminal/src/services/finance.ts†L63-L102】【F:apps/terminal/src/panels/KLinePanel.tsx†L47-L70】【F:apps/terminal/src/utils/useCountdown.ts†L1-L15】
- 当 Electron 尚未就绪时，`finance` service 会回落至 `apps/terminal/test/fixtures/lixinger/` 下的样例，保证本地开发可渲染首屏。 【F:apps/terminal/src/services/finance.ts†L69-L102】

## Error taxonomy & UI states
| 错误分类 | 触发条件 | UI 行为 |
| --- | --- | --- |
| `401`（未授权） | token 缺失/失效 | 展示 `TokenDialog`，引导配置 `MINEBB_LIX_TOKEN` 并提供“重新请求”按钮。 【F:apps/terminal/src/panels/KLinePanel.tsx†L88-L118】【F:apps/terminal/src/components/TokenDialog.tsx†L1-L45】
| `429`（频率限制） | 后端返回 `429xx` | 显示倒计时徽章及禁用的重试按钮；倒计时基于 `meta.ttl`。 【F:apps/terminal/src/services/finance.ts†L20-L47】【F:apps/terminal/src/panels/KLinePanel.tsx†L118-L150】【F:apps/terminal/src/utils/useCountdown.ts†L1-L15】
| `NETWORK` / `TIMEOUT` | 请求超时或网络异常 | 提示失败原因并提供“重试”按钮。 【F:apps/terminal/src/services/finance.ts†L20-L47】【F:apps/terminal/src/panels/KLinePanel.tsx†L128-L150】
| `UNEXPECTED` / 其他 | 未分类异常 | 提示错误码与重试入口，方便日志诊断。 【F:apps/terminal/src/services/finance.ts†L20-L47】【F:apps/terminal/src/panels/KLinePanel.tsx†L128-L150】

## 开发者调试通道
- 在开发模式下可通过 URL 查询参数 `?lxState=401|429|network` 触发对应的 UI 状态，便于截图与验收。 【F:apps/terminal/src/panels/KLinePanel.tsx†L31-L35】【F:apps/terminal/src/panels/KLinePanel.tsx†L152-L175】
