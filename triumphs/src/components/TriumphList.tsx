import { useTriumphStore } from "../hooks/useTriumphStore";

export default function TriumphList() {
  const triumphs = useTriumphStore((s) => s.triumphs);
  const remove = useTriumphStore((s) => s.remove);

  if (triumphs.length === 0) {
    return (
      <div className="border p-4 rounded-xl shadow-sm text-sm text-gray-400">
        No triumphs yet — start your streak!
      </div>
    );
  }

  return (
    <div className="border p-4 rounded-xl shadow-sm space-y-4">
      {triumphs
        .slice()
        .reverse()
        .map((t) => (
          <div key={t.id} className="text-sm border-b pb-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-400">{t.date}</span>
              <button
                onClick={() => remove(t.id)}
                className="text-xs text-red-500 hover:underline"
              >
                delete
              </button>
            </div>
            <ul className="ml-4 list-disc">
              {t.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
}
