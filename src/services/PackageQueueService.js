const API_URL = import.meta.env.VITE_API_URL.endsWith('/') ? import.meta.env.VITE_API_URL.slice(0, -1) : import.meta.env.VITE_API_URL;

class PackageQueueService {
    static queue = new Set(); // Set for O(1) lookup and automatic deduplication
    static sessionKey = null;
    static file = null;
    static id = 0;
    static isRunning = false;
    static onProgressCallback = null;
    static totalChunks = 0;
    static uploadedChunks = 0;
    static onCompleteCallback = null;
    static onErrorCallback = null;
    static uploadedBytes = 0;
    static totalBytes = 0;
    static chunkProgress = {}; // Tracks each chunk's upload status
    static pendingChunks = new Map(); // Map<key, chunkObject> for O(1) lookup and full chunk data storage
    static emptyRetryCount = 0; // Empty or duplicate response counter
    static errorRetryCount = 0; // Network/API error counter
    static maxEmptyRetries = 3; // Maximum empty retry attempts
    static maxErrorRetries = 3; // Maximum error retry attempts
    static activeXHRs = []; // Active XHR requests to cancel if needed

    static reset() {
        // Cancel all active XHR requests
        this.activeXHRs.forEach(xhr => {
            try {
                xhr.abort();
            } catch (e) {
                console.error('Error aborting XHR:', e);
            }
        });
        
        this.queue = new Set();
        this.sessionKey = null;
        this.file = null;
        this.id = 0;
        this.isRunning = false;
        this.onProgressCallback = null;
        this.totalChunks = 0;
        this.uploadedChunks = 0;
        this.onCompleteCallback = null;
        this.onErrorCallback = null;
        this.uploadedBytes = 0;
        this.totalBytes = 0;
        this.chunkProgress = {};
        this.pendingChunks = new Map();
        this.emptyRetryCount = 0;
        this.errorRetryCount = 0;
        this.activeXHRs = [];
    }

    static updateProgress() {
        if (this.onProgressCallback && this.totalBytes > 0) {
            // Sum up uploaded bytes from all chunks
            let totalUploaded = 0;
            for (const key in this.chunkProgress) {
                totalUploaded += this.chunkProgress[key].uploaded;
            }
            
            const progress = (totalUploaded / this.totalBytes) * 100;
            this.onProgressCallback(progress);
            
            // Clean up completed chunks to prevent memory leak
            // Keep only chunks that are still being uploaded (not fully uploaded yet)
            for (const key in this.chunkProgress) {
                const chunk = this.chunkProgress[key];
                // If chunk is fully uploaded and not in queue anymore, remove it
                if (chunk.uploaded === chunk.total && !this.queue.has(key)) {
                    delete this.chunkProgress[key];
                }
            }
        }
    }

    static async startQueue(file, sessionKey, onProgress, onComplete, onError) {
        this.file = file;
        this.sessionKey = sessionKey;
        this.onProgressCallback = onProgress;
        this.onCompleteCallback = onComplete;
        this.onErrorCallback = onError;
        this.isRunning = true;
        this.totalBytes = file.size;
        this.uploadedBytes = 0;
        
        this.getPackageList();
    }

    static async getPackageList() {
        if (!this.isRunning) {
            return;
        }

        if (this.sessionKey === null) {
            setTimeout(() => {
                this.getPackageList();
            }, 100);
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/package/upload/list?sessionKey=${this.sessionKey}&id=${this.id++}`, {
                method: 'POST',
            });

            if (!response.ok) {
                throw new Error(`List API returned ${response.status}: ${response.statusText}`);
            }

            const jsonData = await response.json();
            
            // Successfully received response, reset error counter
            this.errorRetryCount = 0;

            // Count new (unique) chunks from the response
            let newChunkCount = 0;
            if (jsonData.chunks && jsonData.chunks.length > 0) {
                jsonData.chunks.forEach(chunk => {
                    // O(1) lookup with Set/Map - prevents race condition
                    const alreadyProcessed = this.queue.has(chunk.key) || this.pendingChunks.has(chunk.key);
                    if (!alreadyProcessed) {
                        newChunkCount++;
                    }
                });
            }

            // Calculate current progress
            let totalUploaded = 0;
            for (const key in this.chunkProgress) {
                totalUploaded += this.chunkProgress[key].uploaded;
            }
            const currentProgress = this.totalBytes > 0 ? (totalUploaded / this.totalBytes) * 100 : 0;

            // If no new chunks (empty or all duplicates) AND queue has chunks
            if (newChunkCount === 0 && this.queue.size > 0) {
                // If progress reached 100% and no new chunks = successfully completed
                if (currentProgress >= 99.9) {
                    console.log('[PackageQueue] Progress 100%, no new chunks - PKG installation completed successfully!');
                    this.isRunning = false;
                    if (this.onCompleteCallback) {
                        this.onCompleteCallback(jsonData);
                    }
                    this.reset();
                    return;
                }

                this.emptyRetryCount++;
                console.log(`[PackageQueue] No new chunks (empty or duplicate). Progress: ${currentProgress.toFixed(1)}%, Retry: ${this.emptyRetryCount}/${this.maxEmptyRetries}`);
                
                // Reached max retries?
                if (this.emptyRetryCount >= this.maxEmptyRetries) {
                    console.error('[PackageQueue] PKG installation failed - No new chunks received after 3 retries');
                    this.isRunning = false;
                    if (this.onErrorCallback) {
                        this.onErrorCallback(new Error('PKG installation failed - No new chunks received'));
                    }
                    this.reset();
                    return;
                }
                
                // Wait 1 second and retry
                if (this.isRunning) {
                    setTimeout(() => {
                        this.getPackageList();
                    }, 1000);
                }
                return;
            }

            // Queue empty and no new chunks? - Completed!
            if (this.queue.size === 0 && newChunkCount === 0 && this.pendingChunks.size === 0) {
                console.log('[PackageQueue] PKG installation completed successfully!');
                this.isRunning = false;
                if (this.onCompleteCallback) {
                    this.onCompleteCallback(jsonData);
                }
                this.reset();
                return;
            }

            // New chunks available, reset counter
            if (newChunkCount > 0) {
                console.log(`[PackageQueue] ${newChunkCount} new chunks received`);
                this.emptyRetryCount = 0;
            }

            await this.manageChunks(this.file, jsonData.sessionKey, jsonData.chunks);

            // Uploads completed, fetch new list (pending chunks are processed in manageChunks)
            if (this.isRunning) {
                this.getPackageList();
            }
        } catch (error) {
            this.errorRetryCount++;
            console.error(`Package list error (${this.errorRetryCount}/${this.maxErrorRetries}):`, error.message);
            
            // Reached max error retries?
            if (this.errorRetryCount >= this.maxErrorRetries) {
                console.error('[PackageQueue] PKG installation failed - List API failed after 3 retries');
                this.isRunning = false;
                if (this.onErrorCallback) {
                    this.onErrorCallback(new Error('PKG installation failed - List API error'));
                }
                this.reset();
                return;
            }
            
            // Retry on error
            if (this.isRunning) {
                setTimeout(() => {
                    this.getPackageList();
                }, 1000);
            }
        }
    }

    static async uploadChunk(file, sessionKey, data) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const formData = new FormData();
            const chunkSize = data.end - data.start + 1;
            
            // Add XHR to active list for potential cancellation
            this.activeXHRs.push(xhr);
            
            // Start progress tracking for this chunk
            this.chunkProgress[data.key] = {
                total: chunkSize,
                uploaded: 0
            };
            
            formData.append('file', new Blob([file.slice(data.start, data.end + 1)], { type: file.type }));
            
            xhr.open('POST', `${API_URL}/api/package/upload?sessionKey=${sessionKey}&chunkKey=${data.key}`, true);
            xhr.setRequestHeader("Expect", "100-continue");
            
            // Track each chunk's upload progress
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    // Update uploaded bytes for this chunk
                    this.chunkProgress[data.key].uploaded = event.loaded;
                    // Update overall progress
                    this.updateProgress();
                }
            };
            
            xhr.onload = () => {
                // Remove XHR from active list
                const xhrIndex = this.activeXHRs.indexOf(xhr);
                if (xhrIndex > -1) {
                    this.activeXHRs.splice(xhrIndex, 1);
                }
                
                if (xhr.status >= 200 && xhr.status < 300) {
                    this.uploadedChunks++;
                    // Chunk fully uploaded, save full size
                    this.chunkProgress[data.key].uploaded = chunkSize;
                    this.updateProgress();
                    
                    // Add chunks from response to pending list
                    try {
                        const response = JSON.parse(xhr.responseText);
                        
                        if (response.chunks && Array.isArray(response.chunks) && response.chunks.length > 0) {
                            console.log(`[UploadChunk] ${data.key} completed, ${response.chunks.length} chunks in response`);
                            
                            response.chunks.forEach(chunk => {
                                // O(1) lookup with Map - prevents race condition
                                // Map automatically prevents duplicates by key and stores full chunk object
                                if (!this.queue.has(chunk.key)) {
                                    this.pendingChunks.set(chunk.key, chunk);
                                }
                            });
                            
                            console.log(`[UploadChunk] Total pending chunks: ${this.pendingChunks.size}`);
                        }
                        
                        resolve(response);
                    } catch (error) {
                        console.error('[UploadChunk] Response parse error:', error);
                        resolve({});
                    }
                } else {
                    // Clear chunk progress on error
                    delete this.chunkProgress[data.key];
                    reject(new Error('Network response was not ok'));
                }
            };

            xhr.onerror = () => {
                // Remove XHR from active list
                const xhrIndex = this.activeXHRs.indexOf(xhr);
                if (xhrIndex > -1) {
                    this.activeXHRs.splice(xhrIndex, 1);
                }
                
                // Clear chunk progress on error
                delete this.chunkProgress[data.key];
                reject(new Error('Network error'));
            };
            
            xhr.onabort = () => {
                // Remove XHR from active list
                const xhrIndex = this.activeXHRs.indexOf(xhr);
                if (xhrIndex > -1) {
                    this.activeXHRs.splice(xhrIndex, 1);
                }
                
                // Clear chunk progress on abort
                delete this.chunkProgress[data.key];
                reject(new Error('Upload cancelled'));
            };

            xhr.send(formData);
        });
    }

    static async manageChunks(file, sessionKey, dataList) {
        if (!dataList || dataList.length === 0) {
            return;
        }

        // Update total chunk count when chunk list arrives for the first time
        if (this.totalChunks === 0 && dataList.length > 0) {
            // Calculate total chunk count (estimated)
            this.totalChunks = dataList.length;
        }

        const uploadPromises = [];

        for (let i = 0; i < dataList.length; i++) {
            let data = dataList[i];
            
            // Skip if chunk is already in queue - O(1) with Set
            if (this.queue.has(data.key)) {
                continue;
            }

            // Add chunk to queue - Set prevents duplicates automatically
            this.queue.add(data.key);

            // Upload chunk (add to promise array for parallel upload)
            uploadPromises.push(
                this.uploadChunk(file, sessionKey, data).catch(error => {
                    console.error(`Chunk ${data.key} upload error:`, error);
                    // Remove chunk from queue on error so it can be retried
                    this.queue.delete(data.key);
                    // Also clear chunk progress
                    delete this.chunkProgress[data.key];
                })
            );
        }

        // Log number of chunks to be uploaded
        if (uploadPromises.length > 0) {
            console.log(`[PackageQueue] Uploading ${uploadPromises.length} chunks...`);
        }

        // Wait for all chunks to upload
        await Promise.all(uploadPromises);
        
        // Upload completed info
        if (uploadPromises.length > 0) {
            console.log(`[PackageQueue] ${uploadPromises.length} chunks upload completed`);
        }

        // Uploads finished, now check pending chunks
        if (this.pendingChunks.size > 0) {
            if (this.pendingChunks.size >= 2) {
                // If 2 or more pending chunks, upload them first
                console.log(`[PackageQueue] ${this.pendingChunks.size} pending chunks available, uploading them first`);
                
                // Convert Map values to array for processing
                const chunksToProcess = Array.from(this.pendingChunks.values());
                this.pendingChunks.clear(); // Clear pending list
                
                // Process pending chunks (recursive call)
                await this.manageChunks(file, sessionKey, chunksToProcess);
            } else {
                // If 1 or fewer pending chunks, list will be called
                console.log(`[PackageQueue] ${this.pendingChunks.size} pending chunk, list will be called`);
                this.pendingChunks.clear(); // Clear pending (duplicate check already exists)
            }
        }
    }

    static stopQueue() {
        this.isRunning = false;
        this.reset();
    }

    static getSessionKey() {
        return this.sessionKey;
    }
}

export default PackageQueueService;


