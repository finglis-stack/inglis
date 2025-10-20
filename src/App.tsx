import MainApp from './MainApp';
import Q12xApp from './Q12xApp';

const App = () => {
  const hostname = window.location.hostname;
  
  // Affiche Q12x pour le développement local, q12x.sbs et ses sous-domaines.
  const isQ12x = hostname === 'localhost' || hostname === 'q12x.sbs' || hostname.endsWith('.q12x.sbs');

  return isQ12x ? <Q12xApp /> : <MainApp />;
};

export default App;