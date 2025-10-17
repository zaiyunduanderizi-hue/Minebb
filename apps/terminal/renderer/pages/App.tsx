import React from "react";
import KLinePanel from "@minebb/ui/finance/components/KLinePanel";

export default function App() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        padding: "24px",
        boxSizing: "border-box",
        gap: "24px",
      }}
    >
      <header style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Minebb Terminal · K 线预览</h1>
        <p style={{ margin: 0, color: "#9ca3af", fontSize: 14 }}>
          演示基于 Lixinger 接口的 K 线渲染，后端可用时将自动切换为实时数据。
        </p>
      </header>
      <main style={{ display: "grid", gap: "24px" }}>
        <KLinePanel />
      </main>
    </div>
  );
}
