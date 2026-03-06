import { useState, useEffect, useRef } from 'react';
import { useAppDispatch } from '../../context/AppContext';

export default function SearchBar() {
  const dispatch = useAppDispatch();
  const [value, setValue] = useState('');
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      dispatch({ type: 'SET_SEARCH', payload: value });
    }, 250);
    return () => clearTimeout(timer.current);
  }, [value, dispatch]);

  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder="Search properties, cities, anchors..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}
