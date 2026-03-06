import { formatNumber, formatSF, formatCurrency, formatPct } from '../../utils/formatters';

export default function KpiCards({ stats }) {
  return (
    <div className="kpi-grid">
      <div className="kpi-card">
        <div className="kpi-label">Properties</div>
        <div className="kpi-value">{formatNumber(stats.totalProperties)}</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-label">Total SF</div>
        <div className="kpi-value">{formatSF(stats.totalSF)}</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-label">Doors (Meters)</div>
        <div className="kpi-value accent">{formatNumber(stats.totalDoors)}</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-label">Avg Occupancy</div>
        <div className="kpi-value success">{formatPct(stats.avgOccupancy)}</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-label">Monthly Cost</div>
        <div className="kpi-value warning">{formatCurrency(stats.monthlyCost)}</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-label">Annual Cost</div>
        <div className="kpi-value warning">{formatCurrency(stats.annualCost)}</div>
      </div>
    </div>
  );
}
