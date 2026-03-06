import { useAppState, useAppDispatch } from '../../context/AppContext';
import { LEVELS } from '../../constants';

export default function Breadcrumb() {
  const { level, selectedRegion, selectedMarket, selectedProperty } = useAppState();
  const dispatch = useAppDispatch();

  const items = [{ label: 'Portfolio', action: () => dispatch({ type: 'NAVIGATE_NATIONAL' }) }];

  if (level !== LEVELS.NATIONAL && selectedRegion) {
    items.push({
      label: selectedRegion,
      action: () => dispatch({ type: 'NAVIGATE_REGION', payload: selectedRegion }),
    });
  }

  if ((level === LEVELS.MARKET || level === LEVELS.PROPERTY) && selectedMarket) {
    items.push({
      label: selectedMarket,
      action: () => dispatch({ type: 'NAVIGATE_MARKET', payload: selectedMarket }),
    });
  }

  if (level === LEVELS.PROPERTY && selectedProperty) {
    items.push({ label: selectedProperty.name, action: null });
  }

  return (
    <div className="breadcrumb">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i}>
            {i > 0 && <span className="breadcrumb-sep"> / </span>}
            {isLast ? (
              <span className="breadcrumb-current">{item.label}</span>
            ) : (
              <button className="breadcrumb-item" onClick={item.action}>
                {item.label}
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
}
