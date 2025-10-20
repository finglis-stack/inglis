import MainApp from './MainApp';
import Q12xApp from './Q12xApp';

const App = () => {
  // Pour le développement, nous utilisons localhost pour afficher Q12x.
  // En production, cela vérifiera le domaine 'q12x.sbs'.
  const isQ12x = window.location.hostname === 'localhost' || window.location.hostname.endsWith('q12x.sbs');

  return isQ12x ? <Q12xApp /> : <MainApp />;
};

export default App;