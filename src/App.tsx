import TriumphInput from "./components/TriumphInput";
import TriumphList from "./components/TriumphList";

export default function App() {
  return (
    <main className="min-h-screen bg-white text-gray-800 p-6 max-w-xl mx-auto space-y-6">
      <h1 className="text-3xl font-semibold text-center">✨ Zen Triumph Tracker ✨</h1>
      <TriumphInput />
      <TriumphList />
    </main>
  );
}
