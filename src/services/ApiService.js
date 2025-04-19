const API_URL = import.meta.env.VITE_API_URL.endsWith('/') ? import.meta.env.VITE_API_URL.slice(0, -1) : import.meta.env.VITE_API_URL;
class ApiService {
    static async fetch(endpoint) {
        try {
            const response = await fetch(`${API_URL}${endpoint}`);
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
    static async getSystemInfo() {
        return this.fetch('/api/system/info');
    }
    static async getStorageInfo() {
        return this.fetch('/api/storage/info');
    }
    static async getProcessList() {
        return this.fetch('/api/process/list');
    }
    static async executeScript(script) {
        try {
            const response = await fetch(`${API_URL}/api/hscript`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    script
                })
            });
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('Script execution error:', error);
            throw error;
        }
    }
    static async executeScriptStream(script, onChunk) {
        try {
            const response = await fetch(`${API_URL}/api/hscript`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ script })
            });
            const reader = response.body.getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const text = new TextDecoder().decode(value);
                onChunk(text);
            }
        } catch (error) {
            throw error;
        }
    }
    static formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
    }
    static getTitleImageUrl(titleId) {
        return `${API_URL}/api/title/image/${titleId}`;
    }
    static async getSystemStatus() {
        return this.fetch('/api/system/status');
    }
    static async getSystemStats() {
        return this.fetch('/api/system/stats');
    }
    static async getAppList() {
        return this.fetch('/api/app/list');
    }
    static async runApp(titleId) {
        try {
            const response = await fetch(`${API_URL}/api/app/run/${titleId}`);
            return await response.json();
        } catch (error) {
            console.error('App run error:', error);
            throw error;
        }
    }
    static async getProfileList() {
        return this.fetch('/api/profile/list');
    }
    static getProfileImageUrl(profileId) {
        return `${API_URL}/api/profile/image/${profileId}`;
    }
    static async downloadBackup(profileId = null) {
        const url = profileId ? `${API_URL}/api/save/backup/${profileId}` : `${API_URL}/api/save/backup`;
        window.location.href = url;
    }
    static async getTaskList() {
        return this.fetch('/api/task/list');
    }
    static async getTaskDetail(id) {
        try {
            const response = await fetch(`${API_URL}/api/task/detail`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('Task detail error:', error);
            throw error;
        }
    }
    static async updateTask(taskId, updates) {
        try {
            const response = await fetch(`${API_URL}/api/task/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: taskId,
                    ...updates
                })
            });
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            return {
                id: taskId,
                ...updates
            };
        } catch (error) {
            console.error('Task update error:', error);
            throw error;
        }
    }
    static async createTask(name) {
        try {
            const response = await fetch(`${API_URL}/api/task/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('Task create error:', error);
            throw error;
        }
    }
    static async deleteTask(id) {
        try {
            const response = await fetch(`${API_URL}/api/task/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('Task delete error:', error);
            throw error;
        }
    }
    static async streamTaskLog(taskId, onChunk) {
        try {
            const response = await fetch(`${API_URL}/api/task/log`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: taskId })
            });
            
            const reader = response.body.getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const text = new TextDecoder().decode(value);
                onChunk(text);
            }
        } catch (error) {
            console.error('Task log stream error:', error);
            throw error;
        }
    }
    static async getTaskStatus() {
        try {
            const response = await fetch(`${API_URL}/api/task/status`);
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('Task status error:', error);
            throw error;
        }
    }
    static async listFiles(path) {
        try {
            const response = await fetch(`${API_URL}/api/fs/list`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path })
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            return data.map(item => ({
                id: `${item.name}-${item.mtime}`,
                name: item.name,
                type: item.isDirectory ? 'folder' : 'file',
                size: item.size,
                mtime: item.mtime,
                permission: item.mode.toString(8),
                isDirectory: item.isDirectory
            }));
        } catch (error) {
            console.error('Failed to list files:', error);
            throw error;
        }
    }
    static async downloadFiles(paths) {
        try {
            // Concatenate file paths with commas and convert to base64
            const key = btoa(paths.join(','));
            
            // Generate download URL
            const downloadUrl = `${API_URL}/api/fs/download/${key}`;
            
            // Start download in a new tab/window
            window.open(downloadUrl, '_blank');
        } catch (error) {
            console.error('Download error:', error);
            throw error;
        }
    }
    static async renameFile(oldPath, newName) {
        try {
            const response = await fetch(`${API_URL}/api/fs/rename`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    path: oldPath,
                    name: newName
                })
            });

            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('Rename error:', error);
            throw error;
        }
    }
    static async uploadFile(filePath, file, onProgress) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const formData = new FormData();
            formData.append('file', file);

            xhr.open('POST', `${API_URL}/api/fs/upload/${filePath}`, true);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable && onProgress) {
                    const percentComplete = (event.loaded / event.total) * 100;
                    onProgress(percentComplete);
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    reject(new Error('Network response was not ok'));
                }
            };

            xhr.onerror = () => reject(new Error('Network error'));

            xhr.send(formData);
        });
    }
    static async executePayload(path) {
        try {
            const response = await fetch(`${API_URL}/api/fs/payload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ path })
            });

            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('Execute payload error:', error);
            throw error;
        }
    }

    static async uploadPkg(file, onProgress) {
        return new Promise((resolve, reject) => {

            const length = 65536;
            if (file.size < length) {
                console.error("The file is not big enough.");
                return;
            }

            const blob = file.slice(0, length);
            const reader = new FileReader();

            reader.onload = (e) => {
                const buffer = new DataView(e.target.result);

                const magic = buffer.getUint32(0x00, false);
                let packageOffset = 0n;
                const blobs = [];

                // PS5 PKG
                if(magic === 0x7F464948)
                {
                    packageOffset = parseInt(buffer.getBigInt64(0x58, true));
                    blobs.push(file.slice(packageOffset, file.size), file.slice(0, packageOffset));
                }
                // PS4 PKG
                else if (magic === 0x7F434E54)
                {
                    blobs.push(file);
                }else{
                    console.error("Dosya yeterince büyük değil.");
                    return;
                }

                const xhr = new XMLHttpRequest();
                const formData = new FormData();
                formData.append('file', new Blob(blobs, { type: file.type }));

                xhr.open('POST', `${API_URL}/api/package/upload?size=${file.size}&offset=${packageOffset}`, true);

                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable && onProgress) {
                        const percentComplete = (event.loaded / event.total) * 100;
                        onProgress(percentComplete);
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(JSON.parse(xhr.responseText));
                    } else {
                        reject(new Error('Network response was not ok'));
                    }
                };

                xhr.onerror = () => reject(new Error('Network error'));

                xhr.send(formData);
            };

            reader.readAsArrayBuffer(blob);
        });
    }

    static async installPackageFromUrl(url) {
        try {
            const response = await fetch(`${API_URL}/api/package/install`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ path: url })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Network response was not ok');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Package install error:', error);
            throw error;
        }
    }
    
    // Media Gallery API Methods
    static async getMediaList() {
        try {
            const response = await fetch(`${API_URL}/api/media/list`);
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('Media list error:', error);
            throw error;
        }
    }
    
    static getMediaUrl(filePath) {
        const encodedPath = encodeURIComponent(filePath);
        return `${API_URL}/api/media/${encodedPath}`;
    }
    
    static getMediaThumbnailUrl(filePath) {
        const encodedPath = encodeURIComponent(filePath);
        return `${API_URL}/api/media/thumbnails/${encodedPath}`;
    }
    
    static isVideo(filePath) {
        return filePath.toLowerCase().endsWith('.mp4') || 
               filePath.toLowerCase().endsWith('.webm') || 
               filePath.toLowerCase().endsWith('.mov');
    }
}
export default ApiService;