import type { HardhatUserConfig } from "hardhat/types";

import "dotenv/config";
import "@nomiclabs/hardhat-waffle";
import "solidity-coverage";
import "hardhat-deploy";

import "./src/tasks/local_verify";
import "./src/tasks/deploy_contracts";
import "./src/tasks/show_codesize";

import { BigNumber } from "@ethersproject/bignumber";
import { getSingletonFactoryInfo } from "@safe-fndn/safe-singleton-factory";
import env from "env-var";

const DEFAULT_MNEMONIC =
  "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

// Deployer account
const MNEMONIC_PHRASE = env.get("MNEMONIC").default(DEFAULT_MNEMONIC).asString();
const PRIVATE_KEY = env.get("PK").required(!MNEMONIC_PHRASE).asString();

// Custom network
const RPC_NODE_URL = env.get("NODE_URL").asUrlString();

// Custom deployment
const REPLAY_PROTECTION = env.get("CUSTOM_DETERMINISTIC_DEPLOYMENT").asBool();

// Compiler configuration
const SOLIDITY_VERSION = env.get("SOLIDITY_VERSION").default("0.7.6").asString();
const SOLIDITY_SETTINGS = env.get("SOLIDITY_SETTINGS").asJson();

// Contract Verification API
const ETHERSCAN_API_URL = env.get("ETHERSCAN_API_URL").asString();
const ETHERSCAN_API_KEY = env.get("ETHERSCAN_API_KEY").asString();

if (!PRIVATE_KEY && !MNEMONIC_PHRASE) {
  throw new Error("Please set a private key or a mnemonic phrase");
}

const userConfig: HardhatUserConfig = {
  paths: {
    artifacts: "build/artifacts",
    cache: "build/cache",
    deploy: "src/deploy",
    sources: "contracts",
  },
  solidity: {
    compilers: [
      { version: SOLIDITY_VERSION, settings: SOLIDITY_SETTINGS },
      { version: "0.6.12" },
      { version: "0.5.17" },
    ],
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      blockGasLimit: 100000000,
      gas: 100000000,
    },
  },
  namedAccounts: {
    deployer: 0,
  },
  mocha: {
    timeout: 2000000,
  },
};

if (RPC_NODE_URL) {
  userConfig.networks!.custom = {
    url: RPC_NODE_URL,
    accounts: PRIVATE_KEY ? [PRIVATE_KEY] : { mnemonic: `${MNEMONIC_PHRASE}` },
    verify: {
      etherscan: {
        apiUrl: ETHERSCAN_API_URL,
        apiKey: ETHERSCAN_API_KEY,
      },
    },
  };
}

if (REPLAY_PROTECTION) {
  userConfig.deterministicDeployment = (network: string) => {
    const info = getSingletonFactoryInfo(parseInt(network));

    if (!info) {
      throw new Error(`
        Safe factory not found for network ${network}. You can request a new deployment at https://github.com/safe-global/safe-singleton-factory.
        For more information, see https://github.com/safe-global/safe-smart-account#replay-protection-eip-155
      `);
    }

    return {
      factory: info.address,
      deployer: info.signerAddress,
      funding: BigNumber.from(info.gasLimit).mul(BigNumber.from(info.gasPrice)).toString(),
      signedTx: info.transaction,
    };
  };
}

export default userConfig;
