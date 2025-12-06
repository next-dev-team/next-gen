"use client";
import { useState } from "react";

export default function Home() {
  const [count, setCount] = useState(0);
  const containerStyle = { padding: 20 };

  return (
    <div style={containerStyle}>
      <h1>Next.js 16 (Canary) Counter</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
