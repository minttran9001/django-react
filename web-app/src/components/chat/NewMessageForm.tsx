import Composer from "./Composer";

const NewMessageForm = () => {
    return (
        <div className="flex flex-col justify-between items-center mb-4 pt-4 px-4">
            <div className="min-h-100" />
            <Composer conversationId={-1} className="w-full" />
        </div>
    );
};

export default NewMessageForm;