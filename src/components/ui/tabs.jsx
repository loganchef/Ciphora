import * as React from 'react';

// 简单的工具函数来合并CSS类名
const cn = (...classes) => classes.filter(Boolean).join(' ');

// 简单的Tabs组件
function Tabs({ defaultValue, className, children, onChange, ...props }) {
    const [value, setValue] = React.useState(defaultValue);

    // 当defaultValue改变时，同步内部状态
    React.useEffect(() => {
        if (defaultValue !== value) {
            setValue(defaultValue);
        }
    }, [defaultValue, value]);

    const handleValueChange = (newValue) => {
        setValue(newValue);
        if (onChange) {
            onChange(newValue);
        }
    };

    return (
        <div className={cn('', className)} {...props}>
            {React.Children.map(children, child => {
                if (React.isValidElement(child)) {
                    return React.cloneElement(child, {
                        value,
                        setValue: handleValueChange
                    });
                }
                return child;
            })}
        </div>
    );
}

// TabsList组件
function TabsList({ className, variant = 'default', children, value, setValue, ...props }) {
    const baseClasses = 'flex items-center shrink-0';
    const variantClasses = {
        default: 'bg-gray-100 p-1 rounded-lg',
        button: '',
        line: 'border-b border-gray-200',
    };

    return (
        <div
            className={cn(baseClasses, variantClasses[variant], className)}
            {...props}
        >
            {React.Children.map(children, child => {
                if (React.isValidElement(child)) {
                    return React.cloneElement(child, { value, setValue });
                }
                return child;
            })}
        </div>
    );
}

// TabsTrigger组件
function TabsTrigger({ value, setValue, tabValue, className, children, ...props }) {
    const isActive = value === tabValue;

    const baseClasses = 'shrink-0 cursor-pointer whitespace-nowrap inline-flex justify-center items-center transition-all duration-200 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50';

    const handleClick = () => {
        if (typeof setValue === 'function') {
            setValue(tabValue);
        }
    };

    // 从props中移除setValue，避免传递给DOM
    const { setValue: _, ...domProps } = props;

    return (
        <div
            className={cn(
                baseClasses,
                'py-2 px-3 text-sm font-semibold',
                isActive
                    ? 'text-blue-600 border-b-2 border-blue-500'
                    : 'text-gray-500 hover:text-gray-800',
                className
            )}
            onClick={handleClick}
            {...domProps}
        >
            {children}
        </div>
    );
}

export { Tabs, TabsList, TabsTrigger }; 