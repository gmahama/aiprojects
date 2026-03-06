import { useMemo } from 'react';
import { CircleMarker, Tooltip } from 'react-leaflet';
import { useAppState, useAppDispatch } from '../../context/AppContext';
import { REGION_COLORS } from '../../constants';
import { computeCentroid } from '../../utils/geo';
import { formatSF, formatNumber } from '../../utils/formatters';

export default function MarketClusters({ properties }) {
  const { selectedRegion } = useAppState();
  const dispatch = useAppDispatch();
  const color = REGION_COLORS[selectedRegion] || '#58a6ff';

  const markets = useMemo(() => {
    const groups = {};
    for (const p of properties) {
      const m = p.market;
      if (!groups[m]) groups[m] = [];
      groups[m].push(p);
    }
    return Object.entries(groups).map(([name, props]) => {
      const centroid = computeCentroid(props);
      const totalSF = props.reduce((s, p) => s + (p.gla_sf || 0), 0);
      const totalDoors = props.reduce((s, p) => s + (p.estimated_doors || 0), 0);
      return { name, centroid, count: props.length, totalSF, totalDoors };
    }).filter((m) => m.centroid);
  }, [properties]);

  return (
    <>
      {markets.map((m) => (
        <CircleMarker
          key={m.name}
          center={m.centroid}
          radius={8 + Math.log10(Math.max(m.totalSF, 1)) * 3}
          pathOptions={{
            fillColor: color,
            fillOpacity: 0.35,
            color: color,
            weight: 2,
          }}
          eventHandlers={{
            click: () => dispatch({ type: 'NAVIGATE_MARKET', payload: m.name }),
          }}
        >
          <Tooltip direction="top">
            <div className="cluster-label">
              <div className="name">{m.name}</div>
              <div className="count">
                {m.count} properties &middot; {formatSF(m.totalSF)} SF &middot; {formatNumber(m.totalDoors)} doors
              </div>
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  );
}
