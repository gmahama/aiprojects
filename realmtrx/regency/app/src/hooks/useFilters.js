import { useMemo } from 'react';
import { useAppState } from '../context/AppContext';

export function useFilters() {
  const { data, search, regionFilter, stateFilter, occupancyRange, sfRange, doorRange } =
    useAppState();

  return useMemo(() => {
    if (!data) return [];
    let props = data.properties;

    if (search) {
      const q = search.toLowerCase();
      props = props.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q) ||
          p.state.toLowerCase().includes(q) ||
          (p.anchor_tenants || []).some((t) => t.toLowerCase().includes(q))
      );
    }

    if (regionFilter.length > 0) {
      props = props.filter((p) => regionFilter.includes(p.region));
    }

    if (stateFilter.length > 0) {
      props = props.filter((p) => stateFilter.includes(p.state));
    }

    props = props.filter((p) => {
      const occ = p.occupancy_pct ?? 0;
      const sf = p.gla_sf ?? 0;
      const doors = p.estimated_doors ?? 0;
      return (
        occ >= occupancyRange[0] &&
        occ <= occupancyRange[1] &&
        sf >= sfRange[0] &&
        sf <= sfRange[1] &&
        doors >= doorRange[0] &&
        doors <= doorRange[1]
      );
    });

    return props;
  }, [data, search, regionFilter, stateFilter, occupancyRange, sfRange, doorRange]);
}
