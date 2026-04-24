import { Command as CommandPrimitive, useCommandState } from 'cmdk';
import { X } from 'lucide-react';
import * as React from 'react';
import { forwardRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

// Option type: { value: string, label: string, disable?: boolean, fixed?: boolean, [key: string]: any }

function useDebounce(value, delay = 500) {
    const [debouncedValue, setDebouncedValue] = React.useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}

function transToGroupOption(options, groupBy) {
    if (options.length === 0) {
        return {};
    }
    if (!groupBy) {
        return {
            '': options,
        };
    }
    const groupOption = {};
    options.forEach((option) => {
        const key = (option[groupBy] || '');
        if (!groupOption[key]) {
            groupOption[key] = [];
        }
        groupOption[key].push(option);
    });
    return groupOption;
}

function removePickedOption(groupOption, picked) {
    const cloneOption = JSON.parse(JSON.stringify(groupOption));
    for (const [key, value] of Object.entries(cloneOption)) {
        cloneOption[key] = value.filter((val) => !picked.find((p) => p.value === val.value));
    }
    return cloneOption;
}

function isOptionsExist(groupOption, targetOption) {
    for (const [, value] of Object.entries(groupOption)) {
        if (value.some((option) => targetOption.find((p) => p.value === option.value))) {
            return true;
        }
    }
    return false;
}

const CommandEmpty = forwardRef(({ className, ...props }, forwardedRef) => {
    const render = useCommandState((state) => state.filtered.count === 0);
    if (!render) return null;

    return (
        <div
            ref={forwardedRef}
            className={cn('py-6 text-center text-sm', className)}
            cmdk-empty=""
            role="presentation"
            {...props}
        />
    );
});

CommandEmpty.displayName = 'CommandEmpty';

export const MultipleSelector = React.forwardRef(({
    value,
    onChange,
    placeholder,
    defaultOptions: arrayDefaultOptions = [],
    options: arrayOptions,
    delay,
    onSearch,
    onSearchSync,
    loadingIndicator,
    emptyIndicator,
    maxSelected = Number.MAX_SAFE_INTEGER,
    onMaxSelected,
    hidePlaceholderWhenSelected,
    disabled,
    groupBy,
    className,
    badgeClassName,
    selectFirstItem = true,
    creatable = false,
    triggerSearchOnFocus = false,
    commandProps,
    inputProps,
    hideClearAllButton = false,
}, ref) => {
    const inputRef = React.useRef(null);
    const [open, setOpen] = React.useState(false);
    const [onScrollbar, setOnScrollbar] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const dropdownRef = React.useRef(null);
    const [selected, setSelected] = React.useState(value || []);
    const [options, setOptions] = React.useState(
        transToGroupOption(arrayDefaultOptions, groupBy),
    );
    const [inputValue, setInputValue] = React.useState('');
    const debouncedSearchTerm = useDebounce(inputValue, delay || 500);

    React.useImperativeHandle(
        ref,
        () => ({
            selectedValue: [...selected],
            input: inputRef.current,
            focus: () => inputRef?.current?.focus(),
            reset: () => setSelected([])
        }),
        [selected],
    );

    const handleClickOutside = (event) => {
        if (
            dropdownRef.current &&
            !dropdownRef.current.contains(event.target) &&
            inputRef.current &&
            !inputRef.current.contains(event.target)
        ) {
            setOpen(false);
            inputRef.current.blur();
        }
    };

    const handleUnselect = React.useCallback(
        (option) => {
            const newOptions = selected.filter((s) => s.value !== option.value);
            setSelected(newOptions);
            onChange?.(newOptions);
        },
        [onChange, selected],
    );

    const handleKeyDown = React.useCallback(
        (e) => {
            const input = inputRef.current;
            if (input) {
                if (e.key === 'Delete' || e.key === 'Backspace') {
                    if (input.value === '' && selected.length > 0) {
                        const lastSelectOption = selected[selected.length - 1];
                        if (!lastSelectOption.fixed) {
                            handleUnselect(selected[selected.length - 1]);
                        }
                    }
                }
                if (e.key === 'Escape') {
                    input.blur();
                }
            }
        },
        [handleUnselect, selected],
    );

    useEffect(() => {
        if (open) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchend', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchend', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchend', handleClickOutside);
        };
    }, [open, handleClickOutside]);

    useEffect(() => {
        if (value) {
            setSelected(value);
        }
    }, [value]);

    useEffect(() => {
        if (!arrayOptions || onSearch) {
            return;
        }
        const newOption = transToGroupOption(arrayOptions || [], groupBy);
        if (JSON.stringify(newOption) !== JSON.stringify(options)) {
            setOptions(newOption);
        }
    }, [arrayDefaultOptions, arrayOptions, groupBy, onSearch, options]);

    useEffect(() => {
        const doSearchSync = () => {
            const res = onSearchSync?.(debouncedSearchTerm);
            setOptions(transToGroupOption(res || [], groupBy));
        };

        const exec = async () => {
            if (!onSearchSync || !open) return;
            if (triggerSearchOnFocus) {
                doSearchSync();
            }
            if (debouncedSearchTerm) {
                doSearchSync();
            }
        };

        void exec();
    }, [debouncedSearchTerm, groupBy, onSearchSync, open, triggerSearchOnFocus]);

    useEffect(() => {
        const doSearch = async () => {
            setIsLoading(true);
            const res = await onSearch?.(debouncedSearchTerm);
            setOptions(transToGroupOption(res || [], groupBy));
            setIsLoading(false);
        };

        const exec = async () => {
            if (!onSearch || !open) return;
            if (triggerSearchOnFocus) {
                await doSearch();
            }
            if (debouncedSearchTerm) {
                await doSearch();
            }
        };

        void exec();
    }, [debouncedSearchTerm, groupBy, onSearch, open, triggerSearchOnFocus]);

    const CreatableItem = () => {
        if (!creatable) return undefined;
        if (
            isOptionsExist(options, [{ value: inputValue, label: inputValue }]) ||
            selected.find((s) => s.value === inputValue)
        ) {
            return undefined;
        }

        const Item = (
            <CommandItem
                value={inputValue}
                className="cursor-pointer"
                onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }}
                onSelect={(value) => {
                    if (selected.length >= maxSelected) {
                        onMaxSelected?.(selected.length);
                        return;
                    }
                    setInputValue('');
                    const newOptions = [...selected, { value, label: value }];
                    setSelected(newOptions);
                    onChange?.(newOptions);
                }}
            >
                {`Create "${inputValue}"`}
            </CommandItem>
        );

        if (!onSearch && inputValue.length > 0) {
            return Item;
        }
        if (onSearch && debouncedSearchTerm.length > 0 && !isLoading) {
            return Item;
        }
        return undefined;
    };

    const EmptyItem = React.useCallback(() => {
        if (!emptyIndicator) return undefined;
        if (onSearch && !creatable && Object.keys(options).length === 0) {
            return (
                <CommandItem value="-" disabled>
                    {emptyIndicator}
                </CommandItem>
            );
        }
        return <CommandEmpty>{emptyIndicator}</CommandEmpty>;
    }, [creatable, emptyIndicator, onSearch, options]);

    const selectables = React.useMemo(
        () => removePickedOption(options, selected),
        [options, selected],
    );

    const commandFilter = React.useCallback(() => {
        if (commandProps?.filter) {
            return commandProps.filter;
        }
        if (creatable) {
            return (value, search) => {
                return value.toLowerCase().includes(search.toLowerCase()) ? 1 : -1;
            };
        }
        return undefined;
    }, [creatable, commandProps?.filter]);

    return (
        <Command
            ref={dropdownRef}
            {...commandProps}
            onKeyDown={(e) => {
                handleKeyDown(e);
                commandProps?.onKeyDown?.(e);
            }}
            className={cn('h-auto overflow-visible bg-transparent', commandProps?.className)}
            shouldFilter={
                commandProps?.shouldFilter !== undefined ? commandProps.shouldFilter : !onSearch
            }
            filter={commandFilter()}
        >
            <div
                className={cn(
                    'min-h-10 rounded-md border border-input text-base md:text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 w-full',
                    {
                        'px-3 py-2': selected.length !== 0,
                        'cursor-text': !disabled && selected.length !== 0,
                    },
                    className,
                )}
                onClick={() => {
                    if (disabled) return;
                    inputRef?.current?.focus();
                }}
            >
                <div className="relative flex flex-wrap gap-1">
                    {selected.map((option) => {
                        return (
                            <Badge
                                key={option.value}
                                className={cn(
                                    'data-[disabled]:bg-muted-foreground data-[disabled]:text-muted data-[disabled]:hover:bg-muted-foreground',
                                    'data-[fixed]:bg-muted-foreground data-[fixed]:text-muted data-[fixed]:hover:bg-muted-foreground',
                                    badgeClassName,
                                )}
                                data-fixed={option.fixed}
                                data-disabled={disabled || undefined}
                            >
                                {option.label}
                                <button
                                    className={cn(
                                        'ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2',
                                        (disabled || option.fixed) && 'hidden',
                                    )}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleUnselect(option);
                                        }
                                    }}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }}
                                    onClick={() => handleUnselect(option)}
                                >
                                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                </button>
                            </Badge>
                        );
                    })}
                    <CommandPrimitive.Input
                        {...inputProps}
                        ref={inputRef}
                        value={inputValue}
                        disabled={disabled}
                        onValueChange={(value) => {
                            setInputValue(value);
                            inputProps?.onValueChange?.(value);
                        }}
                        onBlur={(event) => {
                            if (!onScrollbar) {
                                setOpen(false);
                            }
                            inputProps?.onBlur?.(event);
                        }}
                        onFocus={(event) => {
                            setOpen(true);
                            triggerSearchOnFocus && onSearch?.(debouncedSearchTerm);
                            inputProps?.onFocus?.(event);
                        }}
                        placeholder={hidePlaceholderWhenSelected && selected.length !== 0 ? '' : placeholder}
                        className={cn(
                            'flex-1 bg-transparent outline-none placeholder:text-muted-foreground',
                            {
                                'w-full': hidePlaceholderWhenSelected,
                                'px-3 py-2': selected.length === 0,
                                'ml-1': selected.length !== 0,
                            },
                            inputProps?.className,
                        )}
                    />
                    <button
                        type="button"
                        onClick={() => {
                            setSelected(selected.filter((s) => s.fixed));
                            onChange?.(selected.filter((s) => s.fixed));
                        }}
                        className={cn(
                            'absolute right-0 h-6 w-6 p-0',
                            (hideClearAllButton ||
                                disabled ||
                                selected.length < 1 ||
                                selected.filter((s) => s.fixed).length === selected.length) &&
                            'hidden',
                        )}
                    >
                        <X />
                    </button>
                </div>
            </div>
            <div className="relative">
                {open && (
                    <CommandList
                        className="absolute top-1 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in"
                        onMouseLeave={() => {
                            setOnScrollbar(false);
                        }}
                        onMouseEnter={() => {
                            setOnScrollbar(true);
                        }}
                        onMouseUp={() => {
                            inputRef?.current?.focus();
                        }}
                    >
                        {isLoading ? (
                            <>{loadingIndicator}</>
                        ) : (
                            <>
                                {EmptyItem()}
                                {CreatableItem()}
                                {!selectFirstItem && <CommandItem value="-" className="hidden" />}
                                {Object.entries(options).map(([key, dropdowns]) => {
                                    const groupOptions = dropdowns || [];
                                    if (groupOptions.length === 0) return null;
                                    
                                    const isGroupSelected = groupOptions.every((opt) => 
                                        selected.some((s) => s.value === opt.value)
                                    );

                                    return (
                                        <CommandGroup 
                                            key={key} 
                                            heading={
                                                <div className="flex items-center justify-between w-full">
                                                    <span>{key}</span>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            let newOptions;
                                                            if (isGroupSelected) {
                                                                // Unselect group
                                                                newOptions = selected.filter(s => 
                                                                    !groupOptions.some(opt => opt.value === s.value)
                                                                );
                                                            } else {
                                                                // Select group
                                                                const toAdd = groupOptions.filter(opt => 
                                                                    !selected.some(s => s.value === opt.value) && !opt.disable
                                                                );
                                                                newOptions = [...selected, ...toAdd];
                                                            }
                                                            setSelected(newOptions);
                                                            onChange?.(newOptions);
                                                        }}
                                                        className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded transition-colors"
                                                    >
                                                        {isGroupSelected ? "取消全选" : "选择全组"}
                                                    </button>
                                                </div>
                                            } 
                                            className="h-full overflow-auto"
                                        >
                                            <>
                                                {groupOptions.map((option) => {
                                                    const isSelected = selected.some((s) => s.value === option.value);
                                                    return (
                                                        <CommandItem
                                                            key={option.value}
                                                            value={option.label}
                                                            disabled={option.disable}
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                            }}
                                                            onSelect={() => {
                                                                if (selected.length >= maxSelected && !isSelected) {
                                                                    onMaxSelected?.(selected.length);
                                                                    return;
                                                                }
                                                                setInputValue('');
                                                                let newOptions;
                                                                if (isSelected) {
                                                                    newOptions = selected.filter((s) => s.value !== option.value);
                                                                } else {
                                                                    newOptions = [...selected, option];
                                                                }
                                                                setSelected(newOptions);
                                                                onChange?.(newOptions);
                                                            }}
                                                            className={cn(
                                                                'cursor-pointer flex items-center gap-2',
                                                                option.disable && 'cursor-default text-muted-foreground',
                                                            )}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                readOnly
                                                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                                            />
                                                            {option.label}
                                                        </CommandItem>
                                                    );
                                                })}
                                            </>
                                        </CommandGroup>
                                    );
                                })}
                                <div className="sticky bottom-0 bg-white border-t border-gray-100 p-1">
                                    <CommandItem
                                        value="select-all"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                        }}
                                        onSelect={() => {
                                            const allOptions = Object.values(options).flat();
                                            const allSelected = allOptions.length > 0 && allOptions.every((opt) =>
                                                selected.some((s) => s.value === opt.value)
                                            );
                                            let newOptions;
                                            if (allSelected) {
                                                newOptions = selected.filter((s) =>
                                                    !allOptions.some((opt) => opt.value === s.value)
                                                );
                                            } else {
                                                const toAdd = allOptions.filter((opt) =>
                                                    !selected.some((s) => s.value === opt.value) && !opt.disable
                                                );
                                                newOptions = [...selected, ...toAdd];
                                            }
                                            setSelected(newOptions);
                                            onChange?.(newOptions);
                                        }}
                                        className="cursor-pointer flex items-center gap-2 font-bold text-blue-600"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={Object.values(options).flat().length > 0 && Object.values(options).flat().every((opt) =>
                                                selected.some((s) => s.value === opt.value)
                                            )}
                                            readOnly
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                        />
                                        全选所有项
                                    </CommandItem>
                                </div>
                            </>
                        )}
                    </CommandList>
                )}
            </div>
        </Command>
    );
});

MultipleSelector.displayName = 'MultipleSelector';

