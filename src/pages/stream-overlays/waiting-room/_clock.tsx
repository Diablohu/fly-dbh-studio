import { useState, useEffect } from "react";
import dayjs from "dayjs";

// ============================================================================

let interval: ReturnType<typeof setInterval>;
const getCurrentTimeText = () => dayjs().format("HH mm");

// ============================================================================

const Clock: React.FC<
    React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLSpanElement>,
        HTMLSpanElement
    >
> = ({ className }) => {
    const [text, setText] = useState(getCurrentTimeText());

    useEffect(() => {
        interval = setInterval(() => {
            setText(getCurrentTimeText());
        }, 1_000);
        return () => {
            if (interval) clearInterval(interval);
        };
    }, []);

    return <span className={className}>{text}</span>;
};

export default Clock;
