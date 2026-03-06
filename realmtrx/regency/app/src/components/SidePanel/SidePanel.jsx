import { useMemo } from 'react';
import { useAppState } from '../../context/AppContext';
import { LEVELS } from '../../constants';
import { aggregate } from '../../utils/aggregations';
import { hasCoords } from '../../utils/geo';
import Breadcrumb from '../Navigation/Breadcrumb';
import SearchBar from '../Navigation/SearchBar';
import Filters from '../Navigation/Filters';
import CostSettings from '../Settings/CostSettings';
import KpiCards from './KpiCards';
import DataTable from './DataTable';
import PropertyCard from './PropertyCard';

export default function SidePanel({ filteredProperties }) {
  const { level, selectedRegion, selectedMarket, costPerMeterPerMonth } = useAppState();

  const scopedProperties = useMemo(() => {
    if (level === LEVELS.REGION && selectedRegion) {
      return filteredProperties.filter((p) => p.region === selectedRegion);
    }
    if ((level === LEVELS.MARKET || level === LEVELS.PROPERTY) && selectedMarket) {
      return filteredProperties.filter((p) => p.market === selectedMarket);
    }
    return filteredProperties;
  }, [filteredProperties, level, selectedRegion, selectedMarket]);

  const stats = useMemo(
    () => aggregate(scopedProperties, costPerMeterPerMonth),
    [scopedProperties, costPerMeterPerMonth]
  );

  const missingCoords = useMemo(
    () => scopedProperties.filter((p) => !hasCoords(p)).length,
    [scopedProperties]
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>Regency Centers</h1>
        <div className="subtitle">Portfolio Utility Meter Explorer</div>
      </div>
      <div className="sidebar-content">
        <Breadcrumb />
        <SearchBar />
        <CostSettings />
        <KpiCards stats={stats} />
        {missingCoords > 0 && (
          <div className="missing-coords">
            {missingCoords} properties without map coordinates (included in stats)
          </div>
        )}
        {level === LEVELS.PROPERTY ? (
          <PropertyCard />
        ) : (
          <DataTable filteredProperties={filteredProperties} />
        )}
        <Filters properties={filteredProperties} />
      </div>
    </aside>
  );
}
