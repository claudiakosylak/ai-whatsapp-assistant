import './App.css';
import { BotSettings } from './components/BotSettings';
import { Header } from './components/Header';

function App() {
  return (
    <>
      <Header />
      <div className="container">
        <div className="top-panels">
          <div className="panel">
            <BotSettings />
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
