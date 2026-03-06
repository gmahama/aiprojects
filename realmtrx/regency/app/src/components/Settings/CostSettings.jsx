import { useAppState, useAppDispatch } from '../../context/AppContext';
import { DEFAULT_COST_PER_METER } from '../../constants';

export default function CostSettings() {
  const { costPerMeterPerMonth } = useAppState();
  const dispatch = useAppDispatch();

  return (
    <div className="cost-settings">
      <span className="label">$/meter/mo:</span>
      <input
        type="number"
        min={0}
        step={10}
        value={costPerMeterPerMonth}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v) && v >= 0) dispatch({ type: 'SET_COST', payload: v });
        }}
      />
      {costPerMeterPerMonth !== DEFAULT_COST_PER_METER && (
        <button
          className="reset-btn"
          onClick={() => dispatch({ type: 'SET_COST', payload: DEFAULT_COST_PER_METER })}
        >
          Reset $100
        </button>
      )}
    </div>
  );
}
