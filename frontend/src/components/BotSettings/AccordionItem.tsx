import { Accordion } from 'radix-ui';
import { FaChevronDown } from "react-icons/fa6";

type Props = {
  title: string;
  value: string;
  children: React.ReactNode;
};

export const AccordionItem = ({ title, value, children }: Props) => {
  return (
    <Accordion.AccordionItem value={value} className="">
      <Accordion.Header className="AccordionHeader">
        {title}
        <Accordion.Trigger className="AccordionTrigger">
          <FaChevronDown className="AccordionChevron" size={15}/>
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content className="AccordionContent">
        {children}
      </Accordion.Content>
    </Accordion.AccordionItem>
  );
};
