declare global {
  interface Window {
    toast: {
      info: (msg: string) => void;
      success: (msg: string) => void;
      error: (msg: string) => void;
      warning: (msg: string) => void;
    };
  }
}

export {};
