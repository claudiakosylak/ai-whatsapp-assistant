import { ChatHistoryItem } from "../../types";

type Props = {
    message: ChatHistoryItem;
}

export const ChatMessage = ({message}: Props) => {

    return (
        <div className={`message ${message.name}`}>
            <div>
                <strong>
                    {message.name}:
                </strong>
                {message.content}
            </div>
            <i className="fa-solid fa-reply" id={`reply-${message.id}`}></i>
        </div>
    )
}
