type Props = {
  children: React.ReactNode;
  label: string;
  checkbox?: boolean;
};

export const SettingsItem = ({ children, label, checkbox = false }: Props) => {
  return (
    <>
      {checkbox ? (
        <div className="settingsItemCheckbox">
          <span>{label}</span>
          <label className="settingsSwitch">
            {children}
            <div className="slider"></div>
          </label>
        </div>
      ) : (
        <div className="settingsItem">
          <label>{label}</label>
          {children}
        </div>
      )}
    </>
  );
};
