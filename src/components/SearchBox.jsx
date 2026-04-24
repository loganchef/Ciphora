import React from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

const SearchBox = ({ value, onChange }) => {
    const { t } = useTranslation();
    const clearSearch = () => onChange('');

    return (
        <div className="relative w-96">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 z-50 text-neutral-700" />

            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={t('placeholders.search')}
                className={`w-full pl-12 pr-3 py-2 border border-gray-200 rounded-xl text-gray-900 bg-white/80 backdrop-blur-sm shadow-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-300 hover:shadow-md placeholder:text-gray-400 placeholder:opacity-100 ${value ? 'pr-12' : 'pr-3'}`}
            />

            {value && (
                <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200 hover:bg-gray-100 rounded-lg"
                >
                    <XMarkIcon className="w-5 h-5" />
                </button>
            )}
        </div>
    );
};

export default SearchBox; 