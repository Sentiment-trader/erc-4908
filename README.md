# ERC-4908: Gated resources NFT access

Tailored for the needs of the [Ipal platform](https://ipal.network/), a web3 friendly [knowledge management platform](https://en.wikipedia.org/wiki/Knowledge_management_software).
See the [specification](./ERC4908.md) for more details.

## Platform implementation

To prove that 0xAlice has access to 0xBob's specific information, the server must:

1. Authenticate 0xAlice via a message wallet signature request.
2. verify locally that `contentId` belongs to 0xBob.
3. call the `hasAccess(0xBob, contentId, 0xAlice)` contract function
4. verify that the result returned is `true`

## Development

### Getting started

```sh
npm install
```

### Tests & cleaning

```sh
npm run test # Pass env var REPORT_GAS=false to deactivate gas reporting
npm run prettier
npm run lint
```

### Deploying the contracts

```sh
cp .env.example .env
vim .env # Add the private key you want to use to deploy the contracts
npx hardhat ignition deploy ./ignition/modules/Example.ts --network testnet --reset
```

### Verifying the contracts

```sh
npx hardhat verify --network testnet <CONTRACT ADDRESS> <CONSTRUCTOR_PARAMETERS>
```

Example:
```sh
npx hardhat verify --network testnet 0xCE92bb8605a96c17C5f2eb1fa8dfe211EAEE7101
```

## License

Copyright (c) 2024 cromatikap

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
