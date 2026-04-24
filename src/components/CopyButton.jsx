import { useState } from 'react';
import { CheckCircleIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';

const CopyButton = ({ text, label, className = "", onCopy }) => {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            onCopy?.();
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    return (
        <button
            onClick={copyToClipboard}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${copied
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                } ${className}`}
        >
            {copied ? (
                <CheckCircleIcon className="w-4 h-4" />
            ) : (
                <ClipboardDocumentIcon className="w-4 h-4" />
            )}
            {copied ? '已复制' : label}
        </button>
    );
};

export default CopyButton;