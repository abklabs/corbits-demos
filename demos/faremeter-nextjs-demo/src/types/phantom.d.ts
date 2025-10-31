interface Window {
  solana?: {
    isPhantom?: boolean;
    connect: (opts?: {
      onlyIfTrusted?: boolean;
    }) => Promise<{ publicKey: any }>;
    disconnect: () => Promise<void>;
    signTransaction: (transaction: any) => Promise<any>;
    signAllTransactions: (transactions: any[]) => Promise<any[]>;
    publicKey: any;
  };
}
