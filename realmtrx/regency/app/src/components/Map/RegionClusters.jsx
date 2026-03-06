import { useMemo } from 'react';
import { CircleMarker, Tooltip } from 'react-leaflet';
import { useAppDispatch } from '../../context/AppContext';
import { REGION_COLORS } from '../../constants';
import { computeCentroid } from '../../utils/geo';
import { formatSF, formatNumber } from '../../utils/formatters';

export default function RegionClusters({ properties }) {
  const dispatch = useAppDispatch();

  const regions = useMemo(() => {
    const groups = {};
    for (const p of properties) {
      const r = p.region;
      if (!groups[r]) groups[r] = [];
      groups[r].push(p);
    }
    return Object.entries(groups).map(([name, props]) => {
      const centroid = computeCentroid(props);
      const totalSF = props.reduce((s, p) => s + (p.gla_sf || 0), 0);
      const totalDoors = props.reduce((s, p) => s + (p.estimated_doors || 0), 0);
      return { name, centroid, count: props.length, totalSF, totalDoors };
    }).filter((r) => r.centroid);
  }, [properties]);

  return (
    <>
      {regions.map((r) => (
        <CircleMarker
          key={r.name}
          center={r.centroid}
          radius={14 + Math.log10(r.totalSF) * 4}
          pathOptions={{
            fillColor: REGION_COLORS[r.name] || '#58a6ff',
            fillOpacity: 0.35,
            color: REGION_COLORS[r.name] || '#58a6ff',
            weight: 2,
          }}
          eventHandlers={{
            click: () => dispatch({ type: 'NAVIGATE_REGION', payload: r.name }),
          }}
        >
          <Tooltip direction="top" permanent={false}>
            <div className="cluster-label">
              <div className="name">{r.name}</div>
              <div className="count">
                {r.count} properties &middot; {formatSF(r.totalSF)} SF &middot; {formatNumber(r.totalDoors)} doors
              </div>
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  );
}
