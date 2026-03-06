import { createContext, useContext, useReducer } from 'react';
import { LEVELS, DEFAULT_COST_PER_METER } from '../constants';

const AppContext = createContext(null);
const DispatchContext = createContext(null);

const initialState = {
  data: null,
  loading: true,
  level: LEVELS.NATIONAL,
  selectedRegion: null,
  selectedMarket: null,
  selectedProperty: null,
  search: '',
  regionFilter: [],
  stateFilter: [],
  occupancyRange: [0, 100],
  sfRange: [0, Infinity],
  doorRange: [0, Infinity],
  costPerMeterPerMonth: DEFAULT_COST_PER_METER,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_DATA':
      return { ...state, data: action.payload, loading: false };
    case 'NAVIGATE_NATIONAL':
      return { ...state, level: LEVELS.NATIONAL, selectedRegion: null, selectedMarket: null, selectedProperty: null };
    case 'NAVIGATE_REGION':
      return { ...state, level: LEVELS.REGION, selectedRegion: action.payload, selectedMarket: null, selectedProperty: null };
    case 'NAVIGATE_MARKET':
      return { ...state, level: LEVELS.MARKET, selectedMarket: action.payload, selectedProperty: null };
    case 'NAVIGATE_PROPERTY':
      return { ...state, level: LEVELS.PROPERTY, selectedProperty: action.payload };
    case 'SET_SEARCH':
      return { ...state, search: action.payload };
    case 'SET_REGION_FILTER':
      return { ...state, regionFilter: action.payload };
    case 'SET_STATE_FILTER':
      return { ...state, stateFilter: action.payload };
    case 'SET_OCCUPANCY_RANGE':
      return { ...state, occupancyRange: action.payload };
    case 'SET_SF_RANGE':
      return { ...state, sfRange: action.payload };
    case 'SET_DOOR_RANGE':
      return { ...state, doorRange: action.payload };
    case 'SET_COST':
      return { ...state, costPerMeterPerMonth: action.payload };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <AppContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </AppContext.Provider>
  );
}

export function useAppState() {
  return useContext(AppContext);
}

export function useAppDispatch() {
  return useContext(DispatchContext);
}
