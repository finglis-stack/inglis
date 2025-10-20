import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainApp from './MainApp';
import Q12xApp from './Q12xApp';

const App = () => {
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;

  // Logique pour le développement local
  if (hostname === 'localhost') {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/q12x/*" element={<Q12xApp />} />
          <Route path="/inglisdominion/*" element={<MainApp />} />
          {/* Par défaut sur localhost, on affiche Q12x pour faciliter le développement du portail marchand */}
          <Route path="/*" element={<Q12xApp />} />
        </Routes>
      </BrowserRouter>
    );
  }

  // Logique pour la production
  const isQ12x = hostname === 'q12x.sbs' || hostname.endsWith('.q12x.sbs');
  
  return (
    <BrowserRouter>
      {isQ12x ? <Q12xApp /> : <MainApp />}
    </BrowserRouter>
  );
};

export default App;