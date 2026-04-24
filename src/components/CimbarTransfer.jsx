import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { QrCode, Lock } from 'lucide-react';
import { MultipleSelector } from '@/components/ui/multiple-selector';
import CimbarQRCode from './CimbarQRCode';
import CimbarDecoder from './CimbarDecoder';

export default function CimbarTransfer({ onClose, passwords = [] }) {
    const [mode, setMode] = useState('generate');
    const [sharePassword, setSharePassword] = useState('');
    const [selectedIds, setSelectedIds] = useState(() => new Set());
    const [isPreparing, setIsPreparing] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('info');
    const [payloadFile, setPayloadFile] = useState(null);
    const [payloadData, setPayloadData] = useState(null);
    const [placeholderText, setPlaceholderText] = useState('等待生成二维码...');

    const rebuildTimer = useRef(null);

    const availablePasswords = useMemo(
        () => (passwords || []).filter((item) => item && (item.id || item._id)),
        [passwords]
    );

    const passwordOptions = useMemo(
        () => availablePasswords.map((entry) => {
            const type = entry.type || entry.dataType || 'password';
            const categoryMap = {
                'mfa': 'MFA',
                'password': 'password',
                'base64': 'base64',
                'string': 'string',
                'json': 'json',
            };
            return {
                value: String(entry.id || entry._id),
                label: entry.title || entry.website || '未命名',
                category: categoryMap[type] || 'password',
            };
        }),
        [availablePasswords]
    );

    const selectedOptions = useMemo(
        () => passwordOptions.filter((opt) => selectedIds.has(opt.value)),
        [passwordOptions, selectedIds]
    );

    const handleSelectionChange = useCallback((options) => {
        const newSelectedIds = new Set(options.map((opt) => opt.value));
        setSelectedIds(newSelectedIds);
    }, []);

    useEffect(() => {
        return () => {
            if (rebuildTimer.current) {
                clearTimeout(rebuildTimer.current);
            }
        };
    }, []);

    useEffect(() => {
        setSelectedIds(() => {
            const ids = availablePasswords.map((item) => item.id || item._id).filter(Boolean);
            if (!ids.length) return new Set();
            return new Set(ids);
        });
    }, [availablePasswords]);

    const buildPayload = useCallback(async () => {
        if (mode !== 'generate' || !availablePasswords.length || selectedIds.size === 0) {
            setMessage('请选择至少一条密码');
            setPayloadFile(null);
            setPayloadData(null);
            setPlaceholderText('未选择条目');
            return;
        }

        setIsPreparing(true);
        try {
            // 模拟构建 payload (实际项目中调用 Tauri API)
            const mockData = JSON.stringify({
                selected: Array.from(selectedIds),
                password: sharePassword,
                timestamp: Date.now()
            });

            const encoded = new TextEncoder().encode(mockData);
            const file = new File([encoded], `vault-${Date.now()}.ciphora`, { type: 'text/plain' });

            setPayloadFile(file);
            setPayloadData(encoded);
            setMessage(`已生成 ${selectedIds.size} 条密码的二维码`);
        } catch (error) {
            console.error('生成失败:', error);
            setMessage('生成失败: ' + error.message);
            setPayloadFile(null);
            setPayloadData(null);
            setPlaceholderText('生成失败');
        } finally {
            setIsPreparing(false);
        }
    }, [availablePasswords.length, mode, selectedIds, sharePassword]);


    // 调度构建
    useEffect(() => {
        if (mode !== 'generate') return;
        if (rebuildTimer.current) clearTimeout(rebuildTimer.current);
        rebuildTimer.current = setTimeout(buildPayload, 300);
    }, [mode, selectedIds, sharePassword, buildPayload]);

    // 处理解码完成
    const handleDecoded = useCallback(({ filename, data }) => {
        // 自动下载文件
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'vault.ciphora';
        a.click();
        URL.revokeObjectURL(url);

        setMessage('✅ 解析完成，文件已下载');
        setMessageType('success');
    }, []);


    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[92vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                        <QrCode className="w-7 h-7 text-blue-500" />
                        <h2 className="text-lg font-semibold">Cimbar 离线传输</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* 模式切换 */}
                        <div className="flex items-center gap-2">
                            <span className={`text-xs ${mode === 'generate' ? 'text-blue-600' : 'text-gray-400'}`}>生成</span>
                            <label className="relative inline-flex w-9 h-5 cursor-pointer items-center">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={mode === 'decode'}
                                    onChange={() => {
                                        const next = mode === 'generate' ? 'decode' : 'generate';
                                        setMode(next);
                                        if (next === 'generate') {
                                            setPlaceholderText('等待生成二维码...');
                                        }
                                    }}
                                />
                                <span className="absolute w-full h-full bg-gray-300 peer-checked:bg-blue-600 rounded-sm transition" />
                                <span className="absolute left-1 top-1 w-3 h-3 bg-white rounded-sm shadow transition peer-checked:translate-x-7" />
                            </label>
                            <span className={`text-xs ${mode === 'decode' ? 'text-blue-600' : 'text-gray-400'}`}>解析</span>
                        </div>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-900 text-xl">&times;</button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-2">
                    {mode === 'generate' ? (
                        <div className="grid gap-4 lg:grid-cols-[280px,1fr] border-0">
                            {/* 控制面板 */}
                            <div className="rounded-xl grid grid-cols-4 gap-3 p-3">
                                <div className="col-span-1 flex h-full items-center gap-2 border-gray-100 bg-gray-50 p-3 rounded-xl">
                                    <Lock className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-semibold">分享密码</span>
                                    <input
                                        type="password"
                                        value={sharePassword}
                                        onChange={(e) => setSharePassword(e.target.value)}
                                        placeholder="可选"
                                        className="w-24 rounded border px-2 py-1 text-xs"
                                    />
                                </div>
                                <div className="col-span-3 rounded-xl border-gray-100 bg-gray-50 p-3 space-y-3 h-full">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span>选择范围 ({selectedIds.size}/{availablePasswords.length})</span>
                                    </div>
                                    <MultipleSelector
                                        value={selectedOptions}
                                        onChange={handleSelectionChange}
                                        placeholder="请选择密码项..."
                                        defaultOptions={passwordOptions}
                                        groupBy="category"
                                        className="w-full border-0 bg-white"
                                    />
                                </div>
                            </div>

                            {/* 画布区域 */}
                            <div className="space-y-2 px-3">
                                <div className="rounded-xl bg-[#F8FAFC] m-auto flex items-center justify-center p-4">
                                    {payloadData ? (
                                        <CimbarQRCode
                                            data={payloadData}
                                            filename={payloadFile?.name || 'vault.ciphora'}
                                            className="w-full"
                                            onError={(err) => {
                                                console.error('二维码生成失败:', err);
                                                setMessage('二维码生成失败: ' + err.message);
                                                setMessageType('error');
                                                setPlaceholderText('生成失败');
                                            }}
                                            onReady={() => {
                                                setMessage('二维码已就绪');
                                                setMessageType('success');
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-[488px] flex items-center justify-center bg-white rounded-lg">
                                            <div className="text-center">
                                                <div className="w-16 h-16 mx-auto mb-2 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                                                <p className="text-sm text-gray-500">{placeholderText}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid gap-4 lg:grid-cols-2">
                            <CimbarDecoder
                                onDecoded={handleDecoded}
                                onError={(err) => {
                                    console.error('解码失败:', err);
                                    setMessage('解码失败: ' + err.message);
                                    setMessageType('error');
                                }}
                            />
                            <div className="rounded-xl border p-3 text-xs space-y-2">
                                <p className="font-semibold">使用提示</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li>生成模式会自动编码选中的密码条目</li>
                                    <li>可设置独立分享密码保护传输数据</li>
                                    <li>解析需实时摄像头,截图无效</li>
                                    <li>解密使用导入功能或命令行工具</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {message && (
                        <div className={`rounded-lg border px-3 py-2 text-xs ${messageType === 'error'
                            ? 'border-red-200 bg-red-50 text-red-800'
                            : messageType === 'success'
                                ? 'border-green-200 bg-green-50 text-green-800'
                                : 'border-blue-100 bg-blue-50 text-blue-800'
                            }`}>
                            {message.split('\n').map((line, i) => (
                                <div key={i}>{line}</div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}