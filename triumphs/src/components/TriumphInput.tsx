import { useState } from "react";
import { useTriumphStore } from "../hooks/useTriumphStore";

export default function TriumphInput() {
  const [input, setInput] = useState("");
  const [items, setItems] = useState<string[]>([]);
  const add = useTriumphStore((s) => s.add);

  const handleAdd = () => {
    if (!input.trim()) return;
    if (items.length >= 3) return;
    setItems([...items, input.trim()]);
    setInput("");
  };

  const handleSubmit = () => {
    if (items.length > 0) {
      add(items);
      setItems([]);
    }
  };

  return (
    <div className="border p-4 rounded-xl shadow-sm space-y-4">
      <div className="flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2 text-sm"
          placeholder="What’s a win from today?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          className="bg-blue-500 text-white text-sm px-4 py-2 rounded disabled:opacity-40"
          onClick={handleAdd}
          disabled={!input.trim() || items.length >= 3}
        >
          Add
        </button>
      </div>

      <ul className="text-sm text-gray-700 space-y-1">
        {items.map((item, i) => (
          <li key={i}>• {item}</li>
        ))}
      </ul>

      <button
        className="w-full text-center bg-green-500 text-white px-4 py-2 text-sm rounded disabled:opacity-30"
        onClick={handleSubmit}
        disabled={items.length === 0}
      >
        Save Triumphs
      </button>
    </div>
  );
}
