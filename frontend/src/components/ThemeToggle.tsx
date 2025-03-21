import { useTheme } from '../ThemeProvider';
import { FaMoon } from "react-icons/fa";
import { FaSun } from "react-icons/fa";

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="theme-switch-wrapper">
      <span className="theme-icon">
        {theme === 'light' ? <FaMoon /> : <FaSun />}
      </span>
      <label className="theme-switch" htmlFor="themeCheckbox">
        <input
          type="checkbox"
          id="themeCheckbox"
          checked={theme === 'dark'}
          onChange={toggleTheme}
        />
        <div className="slider"></div>
      </label>
    </div>
  );
};
