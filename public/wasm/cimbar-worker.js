/**
 * CimbarDecoder Web Worker
 * Runs in an isolated scope. Terminate + recreate to reset WASM fountain decoder state.
 */

// Set Module callback BEFORE importing the script so Emscripten fires it correctly
var Module = {
    locateFile: function(path) {
        if (path.endsWith('.wasm')) return '/wasm/cimbar.wasm';
        return '/wasm/' + path;
    },
    onRuntimeInitialized: function() {
        self.postMessage({ type: 'ready' });
    }
};

importScripts('/wasm/cimbar.js');

// Persistent heap pointers
var imgPtr = 0, imgPtrSize = 0;
var fountainPtr = 0, fountainPtrSize = 0;
var errPtr = 0, errPtrSize = 0;

function ensurePtr(ptr, curSize, needed) {
    if (needed > curSize) {
        if (ptr) Module._free(ptr);
        ptr = Module._malloc(needed);
        curSize = needed;
    }
    return [ptr, curSize];
}

self.onmessage = function(e) {
    var msg = e.data;
    var type = msg.type;
    var id = msg.id;

    if (type === 'decode_frame') {
        var p = msg.payload;
        var pixels = new Uint8Array(p.pixels);
        var width = p.width;
        var height = p.height;
        var mode = p.mode;

        // Ensure image buffer
        var needed = pixels.byteLength;
        var r = ensurePtr(imgPtr, imgPtrSize, needed);
        imgPtr = r[0]; imgPtrSize = r[1];
        Module.HEAPU8.set(pixels, imgPtr);

        Module._cimbard_configure_decode(mode);

        var fountBufSize = Module._cimbard_get_bufsize();
        r = ensurePtr(fountainPtr, fountainPtrSize, fountBufSize);
        fountainPtr = r[0]; fountainPtrSize = r[1];

        var len = Module._cimbard_scan_extract_decode(imgPtr, width, height, 4, fountainPtr, fountBufSize);

        if (len <= 0) {
            self.postMessage({ type: 'frame_result', id: id, progress: null });
            return;
        }

        var fountRes = Module._cimbard_fountain_decode(fountainPtr, len);
        var fileId = Number(typeof fountRes === 'bigint' ? BigInt.asUintN(32, fountRes) : fountRes) >>> 0;

        if (fileId > 0 && fileId < 0xFFFFFFFF) {
            var fileSize = Module._cimbard_get_filesize(fileId);
            if (fileSize <= 0) {
                self.postMessage({ type: 'frame_result', id: id, progress: null });
                return;
            }

            // Read filename
            r = ensurePtr(errPtr, errPtrSize, 1024);
            errPtr = r[0]; errPtrSize = r[1];
            var fnLen = Module._cimbard_get_filename(fileId, errPtr, 1024);
            var filename = 'vault.ciphora';
            if (fnLen > 0) {
                filename = new TextDecoder().decode(new Uint8Array(Module.HEAPU8.buffer, errPtr, fnLen));
            }

            // Read decompressed data
            var decompBufSize = Module._cimbard_get_decompress_bufsize ? Module._cimbard_get_decompress_bufsize() : 65536;
            var decompPtr = Module._malloc(decompBufSize);
            var chunks = [];
            var totalRead = 0;
            while (true) {
                var readSize = Module._cimbard_decompress_read(fileId, decompPtr, decompBufSize);
                if (readSize <= 0) break;
                chunks.push(new Uint8Array(Module.HEAPU8.buffer, decompPtr, readSize).slice());
                totalRead += readSize;
            }
            Module._free(decompPtr);

            if (totalRead > 0) {
                var finalData = new Uint8Array(totalRead);
                var offset = 0;
                for (var i = 0; i < chunks.length; i++) {
                    finalData.set(chunks[i], offset);
                    offset += chunks[i].length;
                }
                self.postMessage({ type: 'file_complete', id: id, filename: filename, data: finalData.buffer }, [finalData.buffer]);
            } else {
                self.postMessage({ type: 'frame_result', id: id, progress: null });
            }
            return;
        }

        // Report progress via get_report
        r = ensurePtr(errPtr, errPtrSize, 1024);
        errPtr = r[0]; errPtrSize = r[1];
        var errLen = Module._cimbard_get_report(errPtr, 1024);
        var progress = null;
        if (errLen > 0) {
            try {
                var report = JSON.parse(new TextDecoder().decode(new Uint8Array(Module.HEAPU8.buffer, errPtr, errLen)));
                if (Array.isArray(report) && report.length > 0) {
                    progress = Math.min(99, Math.round(Math.max.apply(null, report) * 100));
                }
            } catch(ex) {}
        }

        self.postMessage({ type: 'frame_result', id: id, progress: progress });
    }
};
