import React from "react";

type TokenDialogProps = {
  onRefresh?: () => void;
};

export function TokenDialog({ onRefresh }: TokenDialogProps) {
  return (
    <div
      style={{
        border: "1px solid rgba(252, 165, 165, 0.6)",
        background: "rgba(127, 29, 29, 0.25)",
        color: "#fecaca",
        padding: "16px",
        borderRadius: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <strong style={{ fontSize: 16 }}>需要配置 Lixinger Token</strong>
        <span style={{ fontSize: 14, color: "#fecaca" }}>
          请通过环境变量 <code style={{ background: "rgba(255,255,255,0.1)", padding: "2px 4px" }}>MINEBB_LIX_TOKEN</code> 配置访问
          凭证。我们不会在应用中存储明文，重启 Electron 后将自动读取。
        </span>
      </div>
      <div style={{ fontSize: 13, color: "#fde68a" }}>
        更新环境变量后，请刷新终端或点击下方按钮再次尝试。
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onRefresh}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid rgba(251, 191, 36, 0.7)",
            background: "rgba(251, 191, 36, 0.15)",
            color: "#facc15",
            cursor: "pointer",
          }}
        >
          已配置，重新请求
        </button>
      </div>
    </div>
  );
}
