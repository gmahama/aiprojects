import { useMemo } from 'react';
import { CircleMarker, Tooltip } from 'react-leaflet';
import { useAppState, useAppDispatch } from '../../context/AppContext';
import { REGION_COLORS, LEVELS } from '../../constants';
import { hasCoords } from '../../utils/geo';
import { formatNumber, formatSF, formatPct } from '../../utils/formatters';

export default function PropertyMarkers({ properties }) {
  const { level, selectedProperty } = useAppState();
  const dispatch = useAppDispatch();

  const markers = useMemo(
    () => properties.filter(hasCoords),
    [properties]
  );

  return (
    <>
      {markers.map((p) => {
        const isSelected = level === LEVELS.PROPERTY && selectedProperty?.id === p.id;
        const color = REGION_COLORS[p.region] || '#58a6ff';
        const radius = 4 + Math.log10(Math.max(p.gla_sf || 1, 1)) * 1.5;

        return (
          <CircleMarker
            key={p.id}
            center={[p.latitude, p.longitude]}
            radius={isSelected ? radius + 4 : radius}
            pathOptions={{
              fillColor: color,
              fillOpacity: isSelected ? 0.9 : 0.6,
              color: isSelected ? '#ffffff' : color,
              weight: isSelected ? 2 : 1,
            }}
            eventHandlers={{
              click: () => dispatch({ type: 'NAVIGATE_PROPERTY', payload: p }),
            }}
          >
            <Tooltip direction="top">
              <div>
                <strong>{p.name}</strong>
                <br />
                {p.city}, {p.state} &middot; {formatSF(p.gla_sf)} SF
                <br />
                {formatNumber(p.estimated_doors)} doors &middot; {formatPct(p.occupancy_pct)} occ.
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}
