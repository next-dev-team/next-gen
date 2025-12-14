import { useState } from "react";

function App() {
  const [count, setCount] = useState(0);
  const containerStyle = { padding: 20 };

  return (
    <div style={containerStyle}>
      <h1>Vite + React 19 Counter</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
      </div>
    </div>
  );
}

export default App;
