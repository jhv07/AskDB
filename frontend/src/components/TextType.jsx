import React, { useState, useEffect } from "react";
import "./TextType.css";

export default function TextType({
    text = "",
    typingSpeed = 100,
    deletingSpeed = 50,
    pauseDuration = 2000,
    loop = false,
    showCursor = true,
    className = ""
}) {
    const [displayedText, setDisplayedText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        let timeout;

        const handleTyping = () => {
            if (!isDeleting) {
                if (displayedText.length < text.length) {
                    timeout = setTimeout(() => {
                        setDisplayedText(text.slice(0, displayedText.length + 1));
                    }, typingSpeed);
                } else if (loop) {
                    timeout = setTimeout(() => {
                        setIsDeleting(true);
                    }, pauseDuration);
                }
            } else {
                if (displayedText.length > 0) {
                    timeout = setTimeout(() => {
                        setDisplayedText(text.slice(0, displayedText.length - 1));
                    }, deletingSpeed);
                } else {
                    setIsDeleting(false);
                }
            }
        };

        handleTyping();

        return () => clearTimeout(timeout);
    }, [displayedText, isDeleting, text, typingSpeed, deletingSpeed, pauseDuration, loop]);

    return (
        <span className={`text-type ${className}`}>
            {displayedText}
            {showCursor && <span className="text-type__cursor">|</span>}
        </span>
    );
}