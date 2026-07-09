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
import RelatedPartsPage from './pages/RelatedPartsPage';
import PartDetailPage from './pages/PartDetailPage';
import NotFoundPage from './pages/NotFoundPage';
import OdiDbtWizardPage from './pages/OdiDbtWizardPage';
import WizardScenarioPage from './pages/WizardScenarioPage';
import WizardLivePage from './pages/WizardLivePage';
import WizardOutcomePage from './pages/WizardOutcomePage';
import ActivationLivePage from './pages/ActivationLivePage';

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
          <Route path="/related" element={<RelatedPartsPage />} />
          <Route path="/parts/:sku" element={<PartDetailPage />} />
          <Route path="/dbt-wizard" element={<OdiDbtWizardPage />} />
          <Route path="/dbt-wizard/scenario" element={<WizardScenarioPage />} />
          <Route path="/dbt-wizard/live" element={<WizardLivePage />} />
          <Route path="/dbt-wizard/outcome" element={<WizardOutcomePage />} />
          <Route path="/activations-live" element={<ActivationLivePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
