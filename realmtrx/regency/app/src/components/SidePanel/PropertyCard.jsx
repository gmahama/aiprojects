import { useAppState } from '../../context/AppContext';
import { formatNumber, formatSF, formatCurrency, formatPct } from '../../utils/formatters';

export default function PropertyCard() {
  const { selectedProperty: p, costPerMeterPerMonth } = useAppState();
  if (!p) return null;

  const monthlyCost = (p.estimated_doors || 0) * costPerMeterPerMonth;
  const annualCost = monthlyCost * 12;

  return (
    <div className="property-card">
      <h2>{p.name}</h2>
      <div className="address">{p.address}</div>
      <div className="property-detail-grid">
        <div className="property-detail-item">
          <span className="label">GLA</span>
          <span className="value">{formatSF(p.gla_sf)} SF</span>
        </div>
        <div className="property-detail-item">
          <span className="label">Doors (Meters)</span>
          <span className="value">{formatNumber(p.estimated_doors)}</span>
        </div>
        <div className="property-detail-item">
          <span className="label">Monthly Cost</span>
          <span className="value">{formatCurrency(monthlyCost)}</span>
        </div>
        <div className="property-detail-item">
          <span className="label">Annual Cost</span>
          <span className="value">{formatCurrency(annualCost)}</span>
        </div>
        <div className="property-detail-item">
          <span className="label">Occupancy</span>
          <span className="value">{formatPct(p.occupancy_pct)}</span>
        </div>
        <div className="property-detail-item">
          <span className="label">Ownership</span>
          <span className="value">{formatPct(p.ownership_pct)}</span>
        </div>
        <div className="property-detail-item">
          <span className="label">Tenants</span>
          <span className="value">{formatNumber(p.num_tenants)}</span>
        </div>
        <div className="property-detail-item">
          <span className="label">Avg Rent PSF</span>
          <span className="value">{p.avg_base_rent_psf ? '$' + p.avg_base_rent_psf.toFixed(2) : '—'}</span>
        </div>
      </div>
      {p.anchor_tenants && p.anchor_tenants.length > 0 && (
        <div className="property-anchors">
          <div className="label">Anchor Tenants</div>
          <div className="anchor-tags">
            {p.anchor_tenants.map((t, i) => (
              <span key={i} className="anchor-tag">{t}</span>
            ))}
          </div>
        </div>
      )}
      {p.doors_estimated && (
        <div className="missing-coords" style={{ marginTop: 8 }}>
          Door count is estimated from GLA
        </div>
      )}
    </div>
  );
}
