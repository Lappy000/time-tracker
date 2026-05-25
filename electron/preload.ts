import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { SEND_CHANNELS, INVOKE_CHANNELS, RECEIVE_CHANNELS } from './ipc/channels';

export interface IpcResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ElectronAPI {
  send: (channel: string, ...args: unknown[]) => void;
  on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
  invoke: <T = unknown>(channel: string, ...args: unknown[]) => Promise<IpcResult<T>>;
  platform: NodeJS.Platform;
}

// Cast arrays to string[] for includes() check
const sendChannels = SEND_CHANNELS as readonly string[];
const invokeChannels = INVOKE_CHANNELS as readonly string[];
const receiveChannels = RECEIVE_CHANNELS as readonly string[];

const electronAPI: ElectronAPI = {
  send: (channel: string, ...args: unknown[]) => {
    if (sendChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    } else {
      // eslint-disable-next-line no-console
      console.warn(`Blocked send to unauthorized channel: ${channel}`);
    }
  },

  on: (channel: string, callback: (...args: unknown[]) => void) => {
    if (receiveChannels.includes(channel)) {
      const listener = (_event: IpcRendererEvent, ...args: unknown[]) => callback(...args);
      ipcRenderer.on(channel, listener);
      return () => {
        ipcRenderer.removeListener(channel, listener);
      };
    }
    // eslint-disable-next-line no-console
    console.warn(`Blocked listener on unauthorized channel: ${channel}`);
    return () => {};
  },

  invoke: async <T = unknown>(channel: string, ...args: unknown[]): Promise<IpcResult<T>> => {
    if (invokeChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    // eslint-disable-next-line no-console
    console.warn(`Blocked invoke on unauthorized channel: ${channel}`);
    return { success: false, error: 'Unauthorized channel' };
  },

  platform: process.platform
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);