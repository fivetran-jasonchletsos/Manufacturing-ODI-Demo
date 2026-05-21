import { HashRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ArchitecturePage from './pages/ArchitecturePage';
import PipelinePage from './pages/PipelinePage';
import PredictivePage from './pages/PredictivePage';
import SustainabilityPage from './pages/SustainabilityPage';
import PolicyPage from './pages/PolicyPage';
import QualityPage from './pages/QualityPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="/quality" element={<QualityPage />} />
          <Route path="/predictive" element={<PredictivePage />} />
          <Route path="/sustainability" element={<SustainabilityPage />} />
          <Route path="/architecture" element={<ArchitecturePage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
          <Route path="/policy" element={<PolicyPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
