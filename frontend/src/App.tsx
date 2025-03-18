import './App.css';
import { BotSettings } from './components/BotSettings';
import { Header } from './components/Header';
import { TestChat } from './components/TestChat';

function App() {
  return (
    <>
      <Header />
      <div className="container">
        <div className="top-panels">
          <div className="panel">
            <BotSettings />
          </div>
          <div className="panel">
            <TestChat />
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
