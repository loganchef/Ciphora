import React, { useEffect, useRef, useState } from 'react';

const CimbarDisplay = ({ data, mode = 'B' }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const moduleRef = useRef(null);
    const animationRef = useRef(null);

    const [isReady, setIsReady] = useState(false);
    const [isEncoding, setIsEncoding] = useState(false);
    const [error, setError] = useState(null);
    const [frameCount, setFrameCount] = useState(0);
    const [status, setStatus] = useState('初始化中...');

    // 加载 WebAssembly 模块
    useEffect(() => {
        const loadWasm = async () => {
            try {
                setStatus('加载 WebAssembly 模块...');

                // 创建 Module 对象
                const Module = {
                    canvas: canvasRef.current,
                    locateFile: (path) => {
                        if (path.endsWith('.wasm')) {
                            return 'https://cimbar.org/cimbar_js.2025-10-13T0307.wasm';
                        }
                        return path;
                    }
                };

                window.Module = Module;

                // 动态加载 cimbar_js
                const script = document.createElement('script');
                script.src = 'https://cimbar.org/cimbar_js.2025-10-13T0307.js';
                script.crossOrigin = 'anonymous';

                script.onerror = () => {
                    setError('无法加载 libcimbar WebAssembly 模块。请检查网络连接。');
                    setStatus('加载失败');
                };

                script.onload = () => {
                    Module.onRuntimeInitialized = () => {
                        console.log('WASM 模块已初始化');
                        moduleRef.current = window.Module;
                        setIsReady(true);
                        setStatus('就绪');

                        // 设置初始模式
                        setModeConfig(mode);

                        // 调整画布大小
                        resizeCanvas();
                    };
                };

                document.body.appendChild(script);

                return () => {
                    if (script.parentNode) {
                        document.body.removeChild(script);
                    }
                };
            } catch (err) {
                console.error('WASM 加载错误:', err);
                setError('初始化失败: ' + err.message);
                setStatus('初始化失败');
            }
        };

        loadWasm();
    }, []);

    // 设置编码模式
    const setModeConfig = (modeStr) => {
        if (!moduleRef.current) return;

        let modeVal = 68; // 'B' mode (ASCII 'D')
        if (modeStr === '4C') {
            modeVal = 4;
        } else if (modeStr === 'Bm') {
            modeVal = 67; // ASCII 'C'
        }

        try {
            moduleRef.current._cimbare_configure(modeVal, -1);
            const ratio = moduleRef.current._cimbare_get_aspect_ratio();
            console.log('模式设置为:', modeStr, '宽高比:', ratio);
            resizeCanvas(ratio);
        } catch (err) {
            console.error('设置模式失败:', err);
        }
    };

    // 调整画布大小
    const resizeCanvas = (aspectRatio) => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const containerWidth = container.clientWidth - 20;
        const containerHeight = container.clientHeight - 20;
        const ratio = aspectRatio || 1;

        let width = Math.min(containerWidth, 600);
        let height = Math.min(containerHeight, 600);

        if (width / height > ratio) {
            width = height * ratio;
        } else {
            height = width / ratio;
        }

        canvas.style.width = `${Math.floor(width)}px`;
        canvas.style.height = `${Math.floor(height)}px`;
    };

    // 复制数据到 WASM 堆
    const copyToWasmHeap = (data) => {
        const Module = moduleRef.current;
        const dataPtr = Module._malloc(data.length);
        const wasmData = new Uint8Array(Module.HEAPU8.buffer, dataPtr, data.length);
        wasmData.set(data);
        return { ptr: dataPtr, view: wasmData };
    };

    // 编码数据
    const encodeData = async (inputData) => {
        if (!moduleRef.current || !inputData) return;

        setIsEncoding(true);
        setStatus('编码中...');
        setFrameCount(0);

        try {
            const Module = moduleRef.current;

            // 转换数据为字节数组
            const dataArray = typeof inputData === 'string'
                ? new TextEncoder().encode(inputData)
                : new Uint8Array(inputData);

            console.log('开始编码，数据长度:', dataArray.length);

            // 生成文件名
            const filename = `cimbar_${Date.now()}.bin`;
            const filenameBytes = new TextEncoder().encode(filename);
            const { ptr: fnPtr, view: fnView } = copyToWasmHeap(filenameBytes);

            // 初始化编码
            const initResult = Module._cimbare_init_encode(fnView.byteOffset, fnView.length, -1);
            Module._free(fnPtr);

            console.log('初始化编码结果:', initResult);

            if (initResult < 0) {
                throw new Error(`初始化编码失败，返回值: ${initResult}`);
            }

            // 获取编码缓冲区大小
            const chunkSize = Module._cimbare_encode_bufsize();
            console.log('缓冲区大小:', chunkSize);

            // 分块编码
            let offset = 0;
            let encodeCount = 0;

            while (offset < dataArray.length) {
                const end = Math.min(offset + chunkSize, dataArray.length);
                const chunk = dataArray.slice(offset, end);

                const { ptr: dataPtr, view: dataView } = copyToWasmHeap(chunk);

                const encodeResult = Module._cimbare_encode(dataView.byteOffset, dataView.length);
                Module._free(dataPtr);

                console.log(`编码块 ${encodeCount++}, 偏移: ${offset}, 长度: ${chunk.length}, 结果: ${encodeResult}`);

                if (encodeResult === 0 && offset === 0) {
                    // 第一次编码成功
                    setStatus('编码完成，准备播放...');
                } else {
                    const progress = Math.round(((offset + chunk.length) / dataArray.length) * 100);
                    setStatus(`编码进度: ${progress}%`);
                }

                offset = end;

                // 让出主线程，避免阻塞UI
                await new Promise(resolve => setTimeout(resolve, 0));
            }

            // 刷新编码（传入空缓冲区）
            const emptyPtr = Module._malloc(0);
            const flushResult = Module._cimbare_encode(emptyPtr, 0);
            Module._free(emptyPtr);

            console.log('刷新结果:', flushResult);

            setStatus('播放中...');
            setIsEncoding(false);

            // 开始渲染循环
            startRenderLoop();

        } catch (err) {
            console.error('编码错误:', err);
            setError('编码失败: ' + err.message);
            setStatus('编码失败');
            setIsEncoding(false);
        }
    };

    // 渲染循环
    const startRenderLoop = () => {
        if (animationRef.current) {
            clearTimeout(animationRef.current);
        }

        let lastTime = performance.now();

        const render = () => {
            if (!moduleRef.current) return;

            try {
                const now = performance.now();
                const delta = now - lastTime;

                // 渲染当前帧
                moduleRef.current._cimbare_render();

                // 移动到下一帧
                const currentFrame = moduleRef.current._cimbare_next_frame();
                if (currentFrame > 0) {
                    setFrameCount(currentFrame);
                }

                lastTime = now;

                // 控制帧率 (~15fps = 66ms per frame)
                const nextDelay = Math.max(0, 66 - delta);
                animationRef.current = setTimeout(render, nextDelay);
            } catch (err) {
                console.error('渲染错误:', err);
            }
        };

        render();
    };

    // 停止渲染循环
    const stopRenderLoop = () => {
        if (animationRef.current) {
            clearTimeout(animationRef.current);
            animationRef.current = null;
        }
    };

    // 当数据变化时重新编码
    useEffect(() => {
        if (!isReady || !data) {
            stopRenderLoop();
            setFrameCount(0);
            return;
        }

        stopRenderLoop();
        encodeData(data);

        return () => stopRenderLoop();
    }, [data, isReady]);

    // 当模式变化时更新配置
    useEffect(() => {
        if (!isReady) return;
        setModeConfig(mode);
    }, [mode, isReady]);

    // 窗口大小变化
    useEffect(() => {
        const handleResize = () => {
            if (isReady) {
                resizeCanvas();
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isReady]);

    // 清理
    useEffect(() => {
        return () => {
            stopRenderLoop();
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg overflow-hidden"
            style={{ minHeight: '500px' }}
        >
            {error ? (
                <div className="text-center p-8">
                    <div className="text-red-500 text-3xl mb-4">⚠️</div>
                    <div className="text-red-400 text-lg mb-2">加载失败</div>
                    <div className="text-red-300 text-sm max-w-md">{error}</div>
                    <div className="text-gray-500 text-xs mt-4">
                        请检查网络连接或稍后再试
                    </div>
                </div>
            ) : !isReady ? (
                <div className="text-center">
                    <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-blue-500 mx-auto mb-6"></div>
                    <div className="text-blue-400 text-lg">{status}</div>
                    <div className="text-gray-500 text-sm mt-2">正在加载 WebAssembly 模块...</div>
                </div>
            ) : !data ? (
                <div className="text-gray-400 text-center p-8">
                    <div className="text-7xl mb-4">📱</div>
                    <div className="text-2xl font-semibold mb-2">等待数据输入</div>
                    <div className="text-sm text-gray-500">请在左侧输入文本或上传文件</div>
                </div>
            ) : (
                <>
                    <canvas
                        ref={canvasRef}
                        className="border-4 border-black shadow-2xl rounded"
                        style={{ imageRendering: 'pixelated' }}
                    />

                    {frameCount > 0 && !isEncoding && (
                        <div className="absolute bottom-4 left-4 bg-black bg-opacity-80 text-green-400 px-4 py-2 rounded-lg text-sm font-mono backdrop-blur-sm">
                            <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                            帧数: {frameCount}
                        </div>
                    )}

                    <div className="absolute top-4 right-4 bg-black bg-opacity-80 text-cyan-400 px-4 py-2 rounded-lg text-sm font-mono backdrop-blur-sm">
                        模式: {mode}
                    </div>

                    {isEncoding && (
                        <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center backdrop-blur-sm">
                            <div className="bg-gray-800 rounded-xl p-8 text-center shadow-2xl">
                                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-cyan-400 mx-auto mb-4"></div>
                                <div className="text-white text-lg font-semibold">{status}</div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

// 主应用
const App = () => {
    const [inputText, setInputText] = useState('Hello Cimbar! 这是一个测试消息。🎨');
    const [displayData, setDisplayData] = useState(null);
    const [selectedMode, setSelectedMode] = useState('B');
    const [useFile, setUseFile] = useState(false);
    const fileInputRef = useRef(null);

    const handleEncode = () => {
        if (inputText.trim()) {
            setDisplayData(inputText);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            alert('文件过大，请选择小于 10MB 的文件');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            setDisplayData(new Uint8Array(event.target.result));
        };
        reader.onerror = () => {
            alert('文件读取失败');
        };
        reader.readAsArrayBuffer(file);
    };

    const handleClear = () => {
        setDisplayData(null);
        setInputText('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const exampleTexts = [
        'Hello Cimbar! 👋',
        'The quick brown fox jumps over the lazy dog. 🦊',
        '这是一个中文测试 - Chinese Test 中文测试',
        'https://github.com/sz3/libcimbar',
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-bold text-white mb-3">
                        🎨 Cimbar 编码器
                    </h1>
                    <p className="text-gray-300 text-lg">
                        Color Icon Matrix Barcode - 基于颜色的高速数据传输二维码
                    </p>
                    <p className="text-gray-400 text-sm mt-2">
                        传输速度可达 850+ kbps
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 控制面板 */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-gray-800 rounded-xl p-6 shadow-2xl">
                            <h2 className="text-2xl font-semibold text-white mb-4 flex items-center">
                                <span className="mr-2">⚙️</span>
                                控制面板
                            </h2>

                            {/* 输入方式切换 */}
                            <div className="flex gap-2 mb-6">
                                <button
                                    onClick={() => setUseFile(false)}
                                    className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${!useFile
                                            ? 'bg-blue-500 text-white shadow-lg scale-105'
                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                >
                                    📝 文本
                                </button>
                                <button
                                    onClick={() => setUseFile(true)}
                                    className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${useFile
                                            ? 'bg-blue-500 text-white shadow-lg scale-105'
                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                >
                                    📁 文件
                                </button>
                            </div>

                            {/* 文本输入 */}
                            {!useFile ? (
                                <div className="mb-6">
                                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                                        输入数据
                                    </label>
                                    <textarea
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        className="w-full p-3 rounded-lg bg-gray-700 text-white font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        rows="8"
                                        placeholder="输入要编码的文本..."
                                    />
                                    <div className="flex justify-between items-center mt-2">
                                        <div className="text-xs text-gray-500">
                                            {inputText.length} 字符 / {new Blob([inputText]).size} 字节
                                        </div>
                                    </div>

                                    {/* 快速示例 */}
                                    <div className="mt-3">
                                        <div className="text-xs text-gray-400 mb-2">快速示例：</div>
                                        <div className="flex flex-wrap gap-2">
                                            {exampleTexts.map((text, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setInputText(text)}
                                                    className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded"
                                                >
                                                    示例 {idx + 1}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-6">
                                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                                        选择文件（最大 10MB）
                                    </label>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full py-4 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                                    >
                                        <span className="text-2xl">📁</span>
                                        <span>点击选择文件</span>
                                    </button>
                                </div>
                            )}

                            {/* 模式选择 */}
                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-gray-300 mb-2">
                                    编码模式
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { mode: 'B', name: 'B', color: 'green', desc: '标准' },
                                        { mode: 'Bm', name: 'Bm', color: 'yellow', desc: '中等' },
                                        { mode: '4C', name: '4C', color: 'cyan', desc: '高速' }
                                    ].map(({ mode, name, color, desc }) => (
                                        <button
                                            key={mode}
                                            onClick={() => setSelectedMode(mode)}
                                            className={`py-3 px-3 rounded-lg text-sm font-bold transition-all ${selectedMode === mode
                                                    ? `bg-${color}-500 text-white shadow-lg scale-105`
                                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                }`}
                                        >
                                            <div>{name}</div>
                                            <div className="text-xs font-normal opacity-75">{desc}</div>
                                        </button>
                                    ))}
                                </div>
                                <div className="text-xs text-gray-400 mt-3 p-3 bg-gray-700 rounded">
                                    {selectedMode === 'B' && '⚖️ 标准模式 - 平衡速度和可靠性'}
                                    {selectedMode === 'Bm' && '📊 中等模式 - 更高数据密度'}
                                    {selectedMode === '4C' && '⚡ 4色模式 - 最高传输速度'}
                                </div>
                            </div>

                            {/* 操作按钮 */}
                            <div className="space-y-3">
                                <button
                                    onClick={handleEncode}
                                    disabled={(!inputText.trim() && !useFile) || !displayData !== null}
                                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white py-4 px-4 rounded-lg font-bold text-lg shadow-lg transition-all"
                                >
                                    🎨 生成 Cimbar 码
                                </button>
                                <button
                                    onClick={handleClear}
                                    className="w-full bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
                                >
                                    🗑️ 清除
                                </button>
                            </div>
                        </div>

                        {/* 信息说明 */}
                        <div className="bg-gray-800 rounded-xl p-5 shadow-2xl">
                            <h3 className="text-sm font-bold text-white mb-3 flex items-center">
                                <span className="mr-2">💡</span>
                                使用说明
                            </h3>
                            <ul className="text-sm text-gray-300 space-y-2">
                                <li className="flex items-start">
                                    <span className="mr-2">1️⃣</span>
                                    <span>输入文本或上传文件</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-2">2️⃣</span>
                                    <span>选择编码模式（推荐 B 模式）</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-2">3️⃣</span>
                                    <span>点击生成按钮</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-2">4️⃣</span>
                                    <span>用手机 App 扫描动态二维码</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* 显示区域 */}
                    <div className="lg:col-span-2">
                        <div className="bg-gray-800 rounded-xl p-6 shadow-2xl" style={{ minHeight: '600px' }}>
                            <CimbarDisplay data={displayData} mode={selectedMode} />
                        </div>
                    </div>
                </div>

                {/* 底部信息 */}
                <div className="mt-8 text-center text-gray-400 text-sm space-y-2">
                    <p>
                        基于 <a href="https://github.com/sz3/libcimbar" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">libcimbar</a> 开源技术构建
                    </p>
                    <p>
                        下载移动端 App: <a href="https://github.com/sz3/cfc/releases/latest" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline">Android 版本</a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default App;