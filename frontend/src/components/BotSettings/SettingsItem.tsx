type Props = {
  children: React.ReactNode;
  checkbox?: boolean;
};

export const SettingsItem = ({ children, checkbox = false }: Props) => {
  return (
    <>
      {checkbox ? (
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {children}
          </label>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {children}
        </div>
      )}
    </>
  );
};
