import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useAppState } from '../../context/AppContext';
import { useMapView } from '../../hooks/useMapView';
import { LEVELS, MAP_CENTER, MAP_ZOOM } from '../../constants';
import RegionClusters from './RegionClusters';
import MarketClusters from './MarketClusters';
import PropertyMarkers from './PropertyMarkers';

function MapController({ filteredProperties }) {
  const map = useMap();
  const view = useMapView(filteredProperties);
  const { level } = useAppState();

  useEffect(() => {
    if (view.bounds) {
      map.flyToBounds(view.bounds, { padding: [40, 40], duration: 0.8, maxZoom: 13 });
    } else if (view.center) {
      map.flyTo(view.center, view.zoom, { duration: 0.8 });
    }
  }, [map, view, level]);

  return null;
}

export default function Map({ filteredProperties }) {
  const { level, selectedRegion, selectedMarket } = useAppState();

  const scopedProperties = useMemo(() => {
    if (level === LEVELS.REGION && selectedRegion) {
      return filteredProperties.filter((p) => p.region === selectedRegion);
    }
    if (level === LEVELS.MARKET && selectedMarket) {
      return filteredProperties.filter((p) => p.market === selectedMarket);
    }
    return filteredProperties;
  }, [filteredProperties, level, selectedRegion, selectedMarket]);

  return (
    <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} zoomControl={true} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
      />
      <MapController filteredProperties={filteredProperties} />
      {level === LEVELS.NATIONAL && <RegionClusters properties={filteredProperties} />}
      {level === LEVELS.REGION && <MarketClusters properties={scopedProperties} />}
      {(level === LEVELS.MARKET || level === LEVELS.PROPERTY) && (
        <PropertyMarkers properties={scopedProperties} />
      )}
    </MapContainer>
  );
}
