/** biome-ignore-all lint/a11y/noLabelWithoutControl: <explanation> */
import React, { useEffect, useState } from "react";
import { generators } from "./generators-config";

function App() {
  const [startOnBoot, setStartOnBoot] = useState(false);
  const [selectedGenerator, setSelectedGenerator] = useState(null);
  const [answers, setAnswers] = useState({});
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getStartOnBoot().then(setStartOnBoot);
    }
  }, []);

  const handleStartOnBootChange = (e) => {
    const checked = e.target.checked;
    setStartOnBoot(checked);
    if (window.electronAPI) {
      window.electronAPI.setStartOnBoot(checked);
    }
  };

  const handleGeneratorSelect = (gen) => {
    setSelectedGenerator(gen);
    setAnswers({});
    setOutput("");
    // Initialize default values
    const initialAnswers = {};
    gen.prompts.forEach((p) => {
      if (p.default !== undefined && typeof p.default !== "function")
        initialAnswers[p.name] = p.default;
      if (p.type === "checkbox") initialAnswers[p.name] = [];
      if (p.type === "list" && p.choices && p.choices.length > 0)
        initialAnswers[p.name] = p.choices[0].value;
    });
    setAnswers(initialAnswers);
  };

  const handleInputChange = (name, value) => {
    setAnswers((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (name, value, checked) => {
    setAnswers((prev) => {
      const current = prev[name] || [];
      if (checked) {
        return { ...prev, [name]: [...current, value] };
      } else {
        return { ...prev, [name]: current.filter((v) => v !== value) };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setOutput("Running generator...");

    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.runGenerator(
          selectedGenerator.name,
          answers
        );
        setOutput(result.output || "Generator finished successfully!");
      } else {
        setOutput("Electron API not available");
      }
    } catch (err) {
      setOutput(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8 text-blue-400">
        Next Gen Generator
      </h1>

      <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">Settings</h2>
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={startOnBoot}
            onChange={handleStartOnBootChange}
            className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500 bg-gray-700 border-gray-600"
          />
          <span>Start on system boot</span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Generators</h2>
          <div className="space-y-2">
            {generators.map((gen) => (
              <button
                type="button"
                key={gen.name}
                onClick={() => handleGeneratorSelect(gen)}
                className={`w-full text-left p-3 rounded transition-colors ${
                  selectedGenerator?.name === gen.name
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                <div className="font-medium">{gen.name}</div>
                <div className="text-sm opacity-75">{gen.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">
            {selectedGenerator
              ? `Configure ${selectedGenerator.name}`
              : "Select a Generator"}
          </h2>

          {selectedGenerator ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {selectedGenerator.prompts.map((prompt) => (
                <div key={prompt.name}>
                  <label className="block text-sm font-medium mb-1">
                    {prompt.message}
                  </label>

                  {prompt.type === "input" && (
                    <input
                      type="text"
                      value={answers[prompt.name] || ""}
                      onChange={(e) =>
                        handleInputChange(prompt.name, e.target.value)
                      }
                      className="w-full bg-gray-700 border border-gray-600 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  )}

                  {prompt.type === "list" && (
                    <select
                      value={answers[prompt.name] || ""}
                      onChange={(e) =>
                        handleInputChange(prompt.name, e.target.value)
                      }
                      className="w-full bg-gray-700 border border-gray-600 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      {prompt.choices.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}

                  {prompt.type === "checkbox" && (
                    <div className="space-y-2">
                      {prompt.choices.map((c) => (
                        <label
                          key={c.value}
                          className="flex items-center space-x-2"
                        >
                          <input
                            type="checkbox"
                            checked={(answers[prompt.name] || []).includes(
                              c.value
                            )}
                            onChange={(e) =>
                              handleCheckboxChange(
                                prompt.name,
                                c.value,
                                e.target.checked
                              )
                            }
                            className="form-checkbox h-4 w-4 text-blue-600 rounded bg-gray-700 border-gray-600"
                          />
                          <span>{c.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Running..." : "Run Generator"}
              </button>
            </form>
          ) : (
            <p className="text-gray-400">
              Please select a generator from the list to start.
            </p>
          )}
        </div>
      </div>

      {output && (
        <div className="mt-6 bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-2">Output</h2>
          <pre className="bg-black p-4 rounded overflow-x-auto text-sm text-green-400 whitespace-pre-wrap">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}

export default App;
