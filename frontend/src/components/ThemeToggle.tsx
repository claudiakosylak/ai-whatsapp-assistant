import { useTheme } from '../ThemeProvider';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="theme-switch-wrapper">
      <span className="theme-icon">
        <i className={`fas fa-${theme === 'light' ? 'moon' : 'sun'}`}></i>
      </span>
      <label className="theme-switch" htmlFor="checkbox">
        <input
          type="checkbox"
          id="checkbox"
          checked={theme === 'dark'}
          onChange={toggleTheme}
        />
        <div className="slider"></div>
      </label>
    </div>
  );
};
