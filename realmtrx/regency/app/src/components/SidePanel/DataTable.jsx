import { useState, useMemo } from 'react';
import { useAppState, useAppDispatch } from '../../context/AppContext';
import { LEVELS } from '../../constants';
import { aggregateByKey } from '../../utils/aggregations';
import { formatNumber, formatSF, formatCurrency, formatPct } from '../../utils/formatters';

const COLUMNS_BY_LEVEL = {
  [LEVELS.NATIONAL]: [
    { key: 'name', label: 'Region', cls: '' },
    { key: 'totalProperties', label: 'Props', cls: 'num' },
    { key: 'totalSF', label: 'Total SF', cls: 'num' },
    { key: 'totalDoors', label: 'Doors', cls: 'num' },
    { key: 'monthlyCost', label: 'Mo. Cost', cls: 'num' },
    { key: 'avgOccupancy', label: 'Occ %', cls: 'num' },
  ],
  [LEVELS.REGION]: [
    { key: 'name', label: 'Market', cls: '' },
    { key: 'totalProperties', label: 'Props', cls: 'num' },
    { key: 'totalSF', label: 'Total SF', cls: 'num' },
    { key: 'totalDoors', label: 'Doors', cls: 'num' },
    { key: 'monthlyCost', label: 'Mo. Cost', cls: 'num' },
    { key: 'avgOccupancy', label: 'Occ %', cls: 'num' },
  ],
  [LEVELS.MARKET]: [
    { key: 'name', label: 'Property', cls: '' },
    { key: 'city', label: 'City', cls: '' },
    { key: 'gla_sf', label: 'GLA', cls: 'num' },
    { key: 'estimated_doors', label: 'Doors', cls: 'num' },
    { key: 'monthlyCost', label: 'Mo. Cost', cls: 'num' },
    { key: 'occupancy_pct', label: 'Occ %', cls: 'num' },
  ],
};

function formatCell(key, value) {
  if (value == null) return '—';
  if (key === 'totalSF' || key === 'gla_sf') return formatSF(value);
  if (key === 'monthlyCost') return formatCurrency(value);
  if (key === 'avgOccupancy' || key === 'occupancy_pct') return formatPct(value);
  if (typeof value === 'number') return formatNumber(value);
  return value;
}

export default function DataTable({ filteredProperties }) {
  const { level, selectedRegion, selectedMarket, costPerMeterPerMonth } = useAppState();
  const dispatch = useAppDispatch();
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('desc');

  const columns = COLUMNS_BY_LEVEL[level] || COLUMNS_BY_LEVEL[LEVELS.NATIONAL];

  const rows = useMemo(() => {
    if (level === LEVELS.NATIONAL) {
      return aggregateByKey(filteredProperties, 'region', costPerMeterPerMonth);
    }
    if (level === LEVELS.REGION) {
      const regionProps = filteredProperties.filter((p) => p.region === selectedRegion);
      return aggregateByKey(regionProps, 'market', costPerMeterPerMonth);
    }
    if (level === LEVELS.MARKET) {
      const marketProps = filteredProperties.filter((p) => p.market === selectedMarket);
      return marketProps.map((p) => ({
        ...p,
        monthlyCost: (p.estimated_doors || 0) * costPerMeterPerMonth,
      }));
    }
    return [];
  }, [level, filteredProperties, selectedRegion, selectedMarket, costPerMeterPerMonth]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir]);

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  function handleRowClick(row) {
    if (level === LEVELS.NATIONAL) {
      dispatch({ type: 'NAVIGATE_REGION', payload: row.name });
    } else if (level === LEVELS.REGION) {
      dispatch({ type: 'NAVIGATE_MARKET', payload: row.name });
    } else if (level === LEVELS.MARKET) {
      dispatch({ type: 'NAVIGATE_PROPERTY', payload: row });
    }
  }

  const title =
    level === LEVELS.NATIONAL
      ? 'Regions'
      : level === LEVELS.REGION
        ? `Markets in ${selectedRegion}`
        : `Properties in ${selectedMarket}`;

  return (
    <div className="data-table-wrapper">
      <div className="data-table-title">{title}</div>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`${col.cls} ${sortKey === col.key ? 'sorted' : ''}`}
                onClick={() => handleSort(col.key)}
              >
                {col.label}
                {sortKey === col.key && (
                  <span className="sort-arrow">{sortDir === 'asc' ? '▲' : '▼'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, i) => (
            <tr key={row.id || row.name || i} onClick={() => handleRowClick(row)}>
              {columns.map((col) => (
                <td key={col.key} className={col.cls}>
                  {formatCell(col.key, row[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
