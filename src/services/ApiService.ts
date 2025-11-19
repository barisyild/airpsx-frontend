import PackageQueueService from './PackageQueueService';
import {PackageService} from "./PackageService";

const API_URL = import.meta.env.VITE_API_URL.endsWith('/') ? import.meta.env.VITE_API_URL.slice(0, -1) : import.meta.env.VITE_API_URL;

export interface SystemInfo {
    [key: string]: any;
}

export interface StorageInfo {
    [key: string]: any;
}

export interface ProcessInfo {
    [key: string]: any;
}

export interface ScriptExecuteResult {
    [key: string]: any;
}

export interface SystemStatus {
    [key: string]: any;
}

export interface SystemStats {
    [key: string]: any;
}

export interface AppInfo {
    [key: string]: any;
}

export interface ProfileInfo {
    [key: string]: any;
}

export interface TaskInfo {
    id: string | number;
    [key: string]: any;
}

export interface FileItem {
    id: string;
    name: string;
    type: 'folder' | 'file';
    size: number;
    mtime: number;
    permission: string;
    isDirectory: boolean;
}

export interface MediaItem {
    [key: string]: any;
}

export interface RemoteScript {
    [key: string]: any;
}

class ApiService {
    static async fetch<T = any>(endpoint: string): Promise<T> {
        try {
            const response = await fetch(`${API_URL}${endpoint}`);
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    static async getSystemInfo(): Promise<SystemInfo> {
        return this.fetch('/api/system/info');
    }

    static async getStorageInfo(): Promise<StorageInfo> {
        return this.fetch('/api/storage/info');
    }

    static async getProcessList(): Promise<ProcessInfo[]> {
        return this.fetch('/api/process/list');
    }

    static async executeScript(script: string, language: string = 'rulescript'): Promise<ScriptExecuteResult> {
        try {
            const response = await fetch(`${API_URL}/api/script/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    script: script,
                    type: language
                })
            });
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('Script execution error:', error);
            throw error;
        }
    }

    static async executeScriptStream(script: string, onChunk: (text: string) => void, language: string = 'rulescript'): Promise<void> {
        try {
            const response = await fetch(`${API_URL}/api/script/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    script: script,
                    type: language
                })
            });
            const reader = response.body?.getReader();
            if (!reader) throw new Error('No reader available');
            
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

    static formatBytes(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
    }

    static getTitleImageUrl(titleId: string): string {
        return `${API_URL}/api/title/image/${titleId}`;
    }

    static async getSystemStatus(): Promise<SystemStatus> {
        return this.fetch('/api/system/status');
    }

    static async getSystemStats(): Promise<SystemStats> {
        return this.fetch('/api/system/stats');
    }

    static async getAppList(): Promise<AppInfo[]> {
        return this.fetch('/api/app/list');
    }

    static async runApp(titleId: string): Promise<any> {
        try {
            const response = await fetch(`${API_URL}/api/app/run/${titleId}`);
            return await response.json();
        } catch (error) {
            console.error('App run error:', error);
            throw error;
        }
    }

    static async getProfileList(): Promise<ProfileInfo[]> {
        return this.fetch('/api/profile/list');
    }

    static getProfileImageUrl(profileId: string): string {
        return `${API_URL}/api/profile/image/${profileId}`;
    }

    static async downloadBackup(profileId: string | null = null): Promise<void> {
        const url = profileId ? `${API_URL}/api/save/backup/${profileId}` : `${API_URL}/api/save/backup`;
        window.location.href = url;
    }

    static async getTaskList(): Promise<TaskInfo[]> {
        return this.fetch('/api/task/list');
    }

    static async getTaskDetail(id: string | number): Promise<TaskInfo> {
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

    static async updateTask(taskId: string | number, updates: Partial<TaskInfo>): Promise<TaskInfo> {
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

    static async createTask(name: string, type: string = 'rulescript'): Promise<TaskInfo> {
        try {
            const response = await fetch(`${API_URL}/api/task/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, type })
            });
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('Task create error:', error);
            throw error;
        }
    }

    static async deleteTask(id: string | number): Promise<any> {
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

    static async streamTaskLog(taskId: string | number, onChunk: (text: string) => void): Promise<void> {
        try {
            const response = await fetch(`${API_URL}/api/task/log`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: taskId })
            });
            
            const reader = response.body?.getReader();
            if (!reader) throw new Error('No reader available');
            
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

    static async getTaskStatus(): Promise<any> {
        try {
            const response = await fetch(`${API_URL}/api/task/status`);
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('Task status error:', error);
            throw error;
        }
    }

    static async listFiles(path: string): Promise<FileItem[]> {
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
            return data.map((item: any) => ({
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

    static async downloadFiles(paths: string[]): Promise<void> {
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

    static async renameFile(oldPath: string, newName: string): Promise<any> {
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

    static async uploadFile(filePath: string, file: File, onProgress?: (percent: number) => void): Promise<any> {
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

    static async executePayload(path: string): Promise<any> {
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

    static stopPkgUpload(): void {
        // Stop the package queue service
        PackageQueueService.stopQueue();
    }

    static getSessionKey(): string {
        return PackageQueueService.getSessionKey();
    }

    static async cancelPkgUpload(sessionKey: string): Promise<any> {
        try {
            const response = await fetch(`${API_URL}/api/package/upload/cancel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sessionKey })
            });

            if (!response.ok) {
                throw new Error('Failed to cancel package upload');
            }

            return await response.json();
        } catch (error) {
            console.error('Cancel package upload error:', error);
            throw error;
        }
    }

    static async tempFile(arrayBuffer: ArrayBuffer): Promise<string> {
        const response = await fetch(`${API_URL}/api/fs/temp/file`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/octet-stream',
            },
            body: arrayBuffer
        });

        const json = await response.json();
        return json.path;
    }

    static getApiUrl(): string {
        return API_URL;
    }

    // Main Static Method
    static async uploadPkg(file: File, onProgress: (percent: number) => void, onComplete?: (data: any) => void): Promise<any> {
        // 1. Extract Metadata
        const { title, titleId, iconPath } = await PackageService.extractMetadataFromFile(file);

        // 2. Initialize Upload
        // Using URLSearchParams ensures parameters are safely encoded
        const params = new URLSearchParams({
            size: file.size.toString(),
            titleId: titleId,
            title: title,
            iconPath: iconPath || 'null'
        });

        const response = await fetch(`${API_URL}/api/package/upload/init?${params}`, {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const { sessionKey } = await response.json();

        // 3. Start Queue
        // Wrap the callback-based service in a Promise to await its completion
        return new Promise((resolve, reject) => {
            PackageQueueService.startQueue(
                file,
                sessionKey,
                onProgress,
                (completeData) => {
                    if (onComplete) onComplete(completeData);
                    resolve(completeData);
                },
                (error) => {
                    reject(error);
                }
            );
        });
    }

    static async installPackageFromUrl(url: string): Promise<any> {
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
    static async getMediaList(): Promise<MediaItem[]> {
        try {
            const response = await fetch(`${API_URL}/api/media/list`);
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('Media list error:', error);
            throw error;
        }
    }
    
    static getMediaUrl(filePath: string): string {
        const encodedPath = encodeURIComponent(filePath);
        return `${API_URL}/api/media/${encodedPath}`;
    }
    
    static getMediaThumbnailUrl(filePath: string): string {
        const encodedPath = encodeURIComponent(filePath);
        return `${API_URL}/api/media/thumbnails/${encodedPath}`;
    }
    
    static isVideo(filePath: string): boolean {
        return filePath.toLowerCase().endsWith('.mp4') || 
               filePath.toLowerCase().endsWith('.webm') || 
               filePath.toLowerCase().endsWith('.mov');
    }
    
    // File Stream API Methods
    static getStreamUrl(path: string): string {
        return `${API_URL}/api/fs/stream/${path}`;
    }

    static async getRemoteScripts(): Promise<RemoteScript[]> {
        return this.fetch('/api/script/remote/list');
    }

    static async searchRemoteScripts(query: string): Promise<RemoteScript[]> {
        return this.fetch(`/api/script/remote/list?search=${encodeURIComponent(query)}`);
    }

    static getScriptImageUrl(key: string): string {
        return `${API_URL}/api/script/remote/image/${key}`;
    }

    static async executeRemoteScript(key: string): Promise<any> {
        try {
            const response = await fetch(`${API_URL}/api/script/remote/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ key })
            });
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('Remote script execution error:', error);
            throw error;
        }
    }

    static async executeRemoteScriptStream(key: string, onChunk: (text: string) => void): Promise<void> {
        try {
            const response = await fetch(`${API_URL}/api/script/remote/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key })
            });
            
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            
            const reader = response.body?.getReader();
            if (!reader) throw new Error('No reader available');
            
            const decoder = new TextDecoder();
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const text = decoder.decode(value);
                onChunk(text);
            }
        } catch (error) {
            console.error('Remote script execution error:', error);
            throw error;
        }
    }

    static async sendHeartbeat(): Promise<void> {
        try {
            await fetch(`${API_URL}/api/script/remote/heartbeat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.error('Heartbeat error:', error);
            throw error;
        }
    }
}

export default ApiService;

