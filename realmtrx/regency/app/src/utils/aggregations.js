export function aggregate(properties, costPerMeter) {
  const count = properties.length;
  if (count === 0) {
    return {
      totalProperties: 0,
      totalSF: 0,
      totalDoors: 0,
      monthlyCost: 0,
      annualCost: 0,
      avgOccupancy: 0,
    };
  }
  const totalSF = properties.reduce((s, p) => s + (p.gla_sf || 0), 0);
  const totalDoors = properties.reduce((s, p) => s + (p.estimated_doors || 0), 0);
  const monthlyCost = totalDoors * costPerMeter;
  const annualCost = monthlyCost * 12;
  const occupancies = properties.filter((p) => p.occupancy_pct != null);
  const avgOccupancy =
    occupancies.length > 0
      ? occupancies.reduce((s, p) => s + p.occupancy_pct, 0) / occupancies.length
      : 0;
  return { totalProperties: count, totalSF, totalDoors, monthlyCost, annualCost, avgOccupancy };
}

export function aggregateByKey(properties, key, costPerMeter) {
  const groups = {};
  for (const p of properties) {
    const k = p[key] || 'Unknown';
    if (!groups[k]) groups[k] = [];
    groups[k].push(p);
  }
  return Object.entries(groups)
    .map(([name, props]) => ({
      name,
      ...aggregate(props, costPerMeter),
    }))
    .sort((a, b) => b.totalSF - a.totalSF);
}
