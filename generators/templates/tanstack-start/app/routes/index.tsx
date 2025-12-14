import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const [count, setCount] = useState(0);
  return (
    <div className="p-2">
      <h3>TanStack Start Counter</h3>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
    </div>
  );
}
