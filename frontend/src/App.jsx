import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import FichadoPrincipal from './pages/FichadoPrincipal';
import PanelAdmin from './pages/PanelAdmin';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<FichadoPrincipal />} />
        <Route path="/admin" element={<PanelAdmin />} />
      </Routes>
    </Router>
  );
}

export default App;
