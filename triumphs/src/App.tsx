import TriumphInput from "./components/TriumphInput";
import TriumphList from "./components/TriumphList";

export default function App() {
  return (
    <div className="zen-root">
      {/* Zen Garden Animated Background - Improved */}
      <div className="zen-bg">
        {/* Animated Mist Layers - higher and more visible */}
        <svg className="zen-mist" style={{top: '0vh', height: '30vh'}} viewBox="0 0 1200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="600" cy="80" rx="600" ry="60" fill="white" fillOpacity="0.5"/>
          <ellipse cx="300" cy="100" rx="200" ry="30" fill="white" fillOpacity="0.3"/>
          <ellipse cx="900" cy="60" rx="180" ry="25" fill="white" fillOpacity="0.25"/>
        </svg>
        <svg className="zen-mist zen-mist2" style={{top: '15vh', height: '25vh'}} viewBox="0 0 1200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="800" cy="100" rx="400" ry="40" fill="white" fillOpacity="0.3"/>
          <ellipse cx="400" cy="60" rx="250" ry="30" fill="white" fillOpacity="0.2"/>
        </svg>
        {/* Raked Sand Pattern */}
        <svg style={{position: 'absolute', bottom: '20vh', left: 0, width: '100vw', height: '18vh', zIndex: 0}} viewBox="0 0 1200 180" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g stroke="#e0e5d8" strokeWidth="3" strokeDasharray="8 8">
            <path d="M0 40 Q300 80 600 40 T1200 40"/>
            <path d="M0 80 Q300 120 600 80 T1200 80"/>
            <path d="M0 120 Q300 160 600 120 T1200 120"/>
          </g>
        </svg>
        {/* Stones */}
        <svg style={{position: 'absolute', bottom: '22vh', left: '10vw', width: '60px', height: '40px', zIndex: 1}} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="30" cy="30" rx="28" ry="10" fill="#b0b8a0"/>
          <ellipse cx="15" cy="20" rx="10" ry="5" fill="#d2d8c2"/>
        </svg>
        <svg style={{position: 'absolute', bottom: '23vh', left: '60vw', width: '40px', height: '24px', zIndex: 1}} viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="20" cy="18" rx="18" ry="6" fill="#b0b8a0"/>
        </svg>
        {/* Bamboo - right bottom */}
        <svg className="zen-bamboo" style={{position: 'absolute', bottom: '28vh', left: '85vw', width: '32px', height: '80px', zIndex: 2}} viewBox="0 0 32 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="14" y="10" width="4" height="60" rx="2" fill="#6b8f6b"/>
          <rect x="14" y="30" width="4" height="6" rx="2" fill="#8fae8f"/>
          <rect x="14" y="50" width="4" height="6" rx="2" fill="#8fae8f"/>
          <ellipse cx="16" cy="10" rx="6" ry="4" fill="#8fae8f"/>
        </svg>
        {/* Bamboo - left top for framing */}
        <svg className="zen-bamboo" style={{position: 'absolute', top: '4vh', left: '4vw', width: '24px', height: '60px', zIndex: 2, transform: 'scaleX(-1)'}} viewBox="0 0 32 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="14" y="10" width="4" height="60" rx="2" fill="#6b8f6b"/>
          <rect x="14" y="30" width="4" height="6" rx="2" fill="#8fae8f"/>
          <rect x="14" y="50" width="4" height="6" rx="2" fill="#8fae8f"/>
          <ellipse cx="16" cy="10" rx="6" ry="4" fill="#8fae8f"/>
        </svg>
        {/* Forest Silhouette - more lush and higher up */}
        <svg className="zen-forest" style={{height: '32vh', bottom: 0}} viewBox="0 0 1200 220" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g>
            <path d="M0 220 Q120 140 240 220 T480 220 T720 220 T960 220 T1200 220 V220 H0Z" fill="#4a6b4a"/>
            <path d="M100 220 Q200 170 300 220 T500 220 T700 220 T900 220 T1200 220 V220 H100Z" fill="#355335"/>
            {/* More trees for lushness */}
            <rect x="180" y="160" width="10" height="50" fill="#355335"/>
            <ellipse cx="185" cy="160" rx="20" ry="28" fill="#4a6b4a"/>
            <rect x="380" y="180" width="8" height="40" fill="#355335"/>
            <ellipse cx="384" cy="180" rx="16" ry="22" fill="#4a6b4a"/>
            <rect x="950" y="170" width="12" height="50" fill="#355335"/>
            <ellipse cx="956" cy="170" rx="24" ry="30" fill="#4a6b4a"/>
          </g>
        </svg>
        {/* Leaves/particles container (animated leaves) */}
        <div className="zen-leaves">
          {/* Leaf 1 */}
          <svg className="zen-leaf zen-leaf1" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 2 Q28 10 18 34 Q8 10 18 2Z" fill="#7bb274" stroke="#4a6b4a" strokeWidth="1.5"/>
          </svg>
          {/* Leaf 2 */}
          <svg className="zen-leaf zen-leaf2" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="18" cy="18" rx="12" ry="6" fill="#b2d8b2" stroke="#4a6b4a" strokeWidth="1.2"/>
          </svg>
          {/* Leaf 3 */}
          <svg className="zen-leaf zen-leaf3" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 4 Q30 18 18 32 Q6 18 18 4Z" fill="#a3cfa3" stroke="#4a6b4a" strokeWidth="1.2"/>
          </svg>
        </div>
      </div>
      {/* Main App Content - centered and integrated */}
      <div className="app-zen fade-in">
        <h1 className="text-3xl font-semibold text-center">✨ Zen Triumph Tracker ✨</h1>
        <TriumphInput />
        <TriumphList />
      </div>
    </div>
  );
}
