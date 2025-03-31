import { DropdownMenu } from 'radix-ui';
import { FaChevronDown } from 'react-icons/fa6';

export type MenuOption = {
  id: string;
  value: string;
  label: string;
};

type Props = {
  options: MenuOption[];
  selected: string;
  onChange: (val: string) => void;
};

export const Dropdown = ({ options, selected, onChange }: Props) => {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="select select-trigger">
        <p>{selected}</p>
        <FaChevronDown size={12} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="select-content">
          {options.map((option) => {
            return (
              <DropdownMenu.Item
                key={option.id}
                onSelect={() => onChange(option.value)}
                className="select-option"
              >
                {option.label}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
