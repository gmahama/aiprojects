import { useMemo, useState } from 'react';
import { useAppState, useAppDispatch } from '../../context/AppContext';
import { REGION_COLORS } from '../../constants';

export default function Filters({ properties }) {
  const { regionFilter, stateFilter, occupancyRange, sfRange, doorRange } = useAppState();
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);

  const regions = useMemo(() => Object.keys(REGION_COLORS), []);

  const states = useMemo(() => {
    const s = new Set(properties.map((p) => p.state));
    return [...s].sort();
  }, [properties]);

  const maxSF = useMemo(() => {
    if (properties.length === 0) return 1200000;
    return Math.max(...properties.map((p) => p.gla_sf || 0));
  }, [properties]);

  const maxDoors = useMemo(() => {
    if (properties.length === 0) return 500;
    return Math.max(...properties.map((p) => p.estimated_doors || 0));
  }, [properties]);

  function toggleRegion(r) {
    const next = regionFilter.includes(r)
      ? regionFilter.filter((x) => x !== r)
      : [...regionFilter, r];
    dispatch({ type: 'SET_REGION_FILTER', payload: next });
  }

  function toggleState(s) {
    const next = stateFilter.includes(s)
      ? stateFilter.filter((x) => x !== s)
      : [...stateFilter, s];
    dispatch({ type: 'SET_STATE_FILTER', payload: next });
  }

  const hasFilters = regionFilter.length > 0 || stateFilter.length > 0 ||
    occupancyRange[0] > 0 || occupancyRange[1] < 100 ||
    sfRange[0] > 0 || sfRange[1] < Infinity ||
    doorRange[0] > 0 || doorRange[1] < Infinity;

  return (
    <div className="filters-section" style={{ marginTop: 12 }}>
      <button className="filters-toggle" onClick={() => setOpen(!open)}>
        {open ? 'Hide Filters' : 'Filters'}{hasFilters ? ' (active)' : ''}
      </button>
      {open && (
        <>
          <div className="filter-group">
            <div className="filter-label">Region</div>
            <div className="filter-chips">
              {regions.map((r) => (
                <button
                  key={r}
                  className={`filter-chip ${regionFilter.includes(r) ? 'active' : ''}`}
                  style={regionFilter.includes(r) ? { background: REGION_COLORS[r], borderColor: REGION_COLORS[r] } : {}}
                  onClick={() => toggleRegion(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <div className="filter-label">State</div>
            <div className="filter-chips">
              {states.map((s) => (
                <button
                  key={s}
                  className={`filter-chip ${stateFilter.includes(s) ? 'active' : ''}`}
                  onClick={() => toggleState(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <div className="filter-label">Occupancy: {occupancyRange[0]}% — {occupancyRange[1]}%</div>
            <div className="range-slider">
              <input
                type="range"
                min={0}
                max={100}
                value={occupancyRange[0]}
                onChange={(e) =>
                  dispatch({ type: 'SET_OCCUPANCY_RANGE', payload: [+e.target.value, occupancyRange[1]] })
                }
              />
              <input
                type="range"
                min={0}
                max={100}
                value={occupancyRange[1]}
                onChange={(e) =>
                  dispatch({ type: 'SET_OCCUPANCY_RANGE', payload: [occupancyRange[0], +e.target.value] })
                }
              />
            </div>
          </div>
          <div className="filter-group">
            <div className="filter-label">SF Range: 0 — {sfRange[1] === Infinity ? maxSF.toLocaleString() : sfRange[1].toLocaleString()}</div>
            <div className="range-slider">
              <input
                type="range"
                min={0}
                max={maxSF}
                step={1000}
                value={sfRange[1] === Infinity ? maxSF : sfRange[1]}
                onChange={(e) =>
                  dispatch({ type: 'SET_SF_RANGE', payload: [sfRange[0], +e.target.value] })
                }
              />
            </div>
          </div>
          <div className="filter-group">
            <div className="filter-label">Door Range: 0 — {doorRange[1] === Infinity ? maxDoors.toLocaleString() : doorRange[1].toLocaleString()}</div>
            <div className="range-slider">
              <input
                type="range"
                min={0}
                max={maxDoors}
                value={doorRange[1] === Infinity ? maxDoors : doorRange[1]}
                onChange={(e) =>
                  dispatch({ type: 'SET_DOOR_RANGE', payload: [doorRange[0], +e.target.value] })
                }
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
