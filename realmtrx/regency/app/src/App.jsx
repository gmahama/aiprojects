import { useData } from './hooks/useData';
import { useAppState } from './context/AppContext';
import { useFilters } from './hooks/useFilters';
import SidePanel from './components/SidePanel/SidePanel';
import Map from './components/Map/Map';
import './App.css';

export default function App() {
  useData();
  const { loading } = useAppState();
  const filteredProperties = useFilters();

  if (loading) {
    return <div className="loading">Loading portfolio data...</div>;
  }

  return (
    <div className="app">
      <SidePanel filteredProperties={filteredProperties} />
      <div className="map-container">
        <Map filteredProperties={filteredProperties} />
      </div>
    </div>
  );
}
