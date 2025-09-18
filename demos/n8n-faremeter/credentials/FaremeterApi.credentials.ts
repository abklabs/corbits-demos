import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class FaremeterApi implements ICredentialType {
  name = 'faremeterApi';
  displayName = 'Faremeter API';
  documentationUrl = 'https://github.com/abklabs/corbits-demos';
  properties: INodeProperties[] = [
    {
      displayName: 'Payment Scheme',
      name: 'scheme',
      type: 'options',
      options: [
        {
          name: 'Exact Payment',
          value: 'exact',
          description: 'Use exact payment verification',
        },
        {
          name: 'X-Solana Settlement',
          value: '@faremeter/x-solana-settlement',
          description: 'Use X-Solana settlement protocol',
        },
      ],
      default: 'exact',
      description: 'The payment verification scheme to use',
    },
    {
      displayName: 'Network',
      name: 'network',
      type: 'options',
      options: [
        {
          name: 'Solana Devnet',
          value: 'solana-devnet',
          description: 'Use Solana devnet for testing',
        },
        {
          name: 'Solana Mainnet',
          value: 'solana-mainnet',
          description: 'Use Solana mainnet for production',
        },
      ],
      default: 'solana-devnet',
      description: 'The Solana network to use',
    },
    {
      displayName: 'Asset Mint Address',
      name: 'assetMint',
      type: 'string',
      default: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      placeholder: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      description: 'The SPL token mint address (USDC on devnet)',
      displayOptions: {
        show: {
          network: ['solana-devnet'],
        },
      },
    },
    {
      displayName: 'Asset Mint Address',
      name: 'assetMint',
      type: 'string',
      default: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      placeholder: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      description: 'The SPL token mint address (USDC on mainnet)',
      displayOptions: {
        show: {
          network: ['solana-mainnet'],
        },
      },
    },
    {
      displayName: 'Payment Recipient Address',
      name: 'paytoAddress',
      type: 'string',
      default: '',
      placeholder: 'YOUR_SOLANA_WALLET_ADDRESS',
      description: 'The Solana wallet address that will receive payments',
      required: true,
    },
    {
      displayName: 'Facilitator URL',
      name: 'facilitatorUrl',
      type: 'string',
      default: 'https://facilitator.corbits.dev',
      placeholder: 'https://facilitator.corbits.dev',
      description: 'The Faremeter facilitator service URL',
    },
    {
      displayName: 'Solana RPC URL',
      name: 'rpcUrl',
      type: 'string',
      default: 'https://api.devnet.solana.com',
      placeholder: 'https://api.devnet.solana.com',
      displayOptions: {
        show: {
          scheme: ['exact'],
          network: ['solana-devnet'],
        },
      },
      description: 'The Solana RPC endpoint URL',
    },
    {
      displayName: 'Solana RPC URL',
      name: 'rpcUrl',
      type: 'string',
      default: 'https://api.mainnet-beta.solana.com',
      placeholder: 'https://api.mainnet-beta.solana.com',
      displayOptions: {
        show: {
          scheme: ['exact'],
          network: ['solana-mainnet'],
        },
      },
      description: 'The Solana RPC endpoint URL',
    },
  ];
}
