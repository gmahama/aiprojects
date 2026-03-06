import { useMemo } from 'react';
import { useAppState } from '../context/AppContext';
import { computeBounds, computeCentroid } from '../utils/geo';
import { LEVELS, MAP_CENTER, MAP_ZOOM } from '../constants';

export function useMapView(filteredProperties) {
  const { level, selectedRegion, selectedMarket, selectedProperty } = useAppState();

  return useMemo(() => {
    if (level === LEVELS.PROPERTY && selectedProperty) {
      if (selectedProperty.latitude != null && selectedProperty.longitude != null) {
        return { center: [selectedProperty.latitude, selectedProperty.longitude], zoom: 15, bounds: null };
      }
      return { center: MAP_CENTER, zoom: MAP_ZOOM, bounds: null };
    }

    let scopedProps = filteredProperties;
    if (level === LEVELS.REGION && selectedRegion) {
      scopedProps = filteredProperties.filter((p) => p.region === selectedRegion);
    } else if (level === LEVELS.MARKET && selectedMarket) {
      scopedProps = filteredProperties.filter((p) => p.market === selectedMarket);
    }

    const bounds = computeBounds(scopedProps);
    if (bounds) {
      return { center: null, zoom: null, bounds };
    }
    return { center: MAP_CENTER, zoom: MAP_ZOOM, bounds: null };
  }, [level, selectedRegion, selectedMarket, selectedProperty, filteredProperties]);
}
