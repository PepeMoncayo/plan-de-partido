// Punto único de entrada a la IA. La UI solo importa de aquí.
import { mockProvider } from './mockProvider';
import { claudeProvider } from './claudeProvider';

const providers = { mock: mockProvider, claude: claudeProvider };
const name = import.meta.env.VITE_AI_PROVIDER || 'mock';
const provider = providers[name] ?? mockProvider;

export const aiProviderName = providers[name] ? name : 'mock';
export const isSimulatedAI = aiProviderName === 'mock';

export const analyzeMatchup = (input) => provider.analyzeMatchup(input);
export const analyzePlayerPosition = (input) => provider.analyzePlayerPosition(input);
export const analyzeOpponent = (input) => provider.analyzeOpponent(input);
export const generateMatchPlan = (input) => provider.generateMatchPlan(input);
export const suggestLineup = (input) => provider.suggestLineup(input);
export const summarizeMatch = (input) => provider.summarizeMatch(input);
