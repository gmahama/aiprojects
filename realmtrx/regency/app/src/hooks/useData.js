import { useEffect } from 'react';
import { useAppDispatch } from '../context/AppContext';

export function useData() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    fetch('/data/regency_properties.json')
      .then((r) => r.json())
      .then((data) => dispatch({ type: 'SET_DATA', payload: data }))
      .catch((err) => console.error('Failed to load data:', err));
  }, [dispatch]);
}
