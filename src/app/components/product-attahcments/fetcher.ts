// tslint:disable: max-line-length
// tslint:disable: no-console

import Web3 from "web3";

// Almost completely copied from root/eth-storage-fetcher, except for conversion to TypeScript

// local
// const ethereumURL = "http://localhost:8545";
// const productContractAddress = "0x9b5e9fee2abf5e941aed685968308fbff7ac832b";  // see contract deploy log etc.

const productContractAddress = "0xd3b4fcdc909a1918d30565cd2b19906ad1e6e043"; // see contract deploy log etc.

const bcBlockAsOfToGetInfo = "latest";

/**
 * This class extracts data (particularly, product attachments)
 * of the product previously saved into the specified blockchain
 * for the given product id
 *
 * Relevant documentation and articles:
 * https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_getstorageat
 * https://medium.com/@flores.eugenio03/exploring-the-storage-layout-in-solidity-and-how-to-access-state-variables-bf2cbc6f8018#949c
 * https://coinsbench.com/solidity-layout-and-access-of-storage-variables-simply-explained-1ce964d7c738
 * https://blockchain-academy.hs-mittweida.de/courses/solidity-coding-beginners-to-intermediate/lessons/solidity-12-reading-the-storage/topic/reading-the-ethereum-storage/
 */
export class BlockchainProductDataFetcher {
    _productId: string;
    _productPositionInStorage: string | null;
    private web3: Web3;

    constructor(nodeUrl: string, productId: string) {
        this.web3 = new Web3(nodeUrl);

        this._productId = productId; // e.g. "0x9585c0822c57bd4c269f463e87b51c7bd48d53d10add50c975e332cf3a66c774"
    }

    async _getFromStorageAt(position: string) {
        return this.web3.eth.getStorageAt(
            productContractAddress,
            position,
            bcBlockAsOfToGetInfo
        );
    }

    async getProductBrand() {
        if (!this._productPositionInStorage) {
            this._productPositionInStorage = this._calcProductPositionInStorage();
        }

        const brandPosition = this._getIndexRelativeTo(
            this._productPositionInStorage,
            1
        ); // e.g. "0x180c3e3c7be7d2f873f5bc90322650ab3fd8267dee346423a18eb27c01c52f73"
        return this._getFromStorageAt(brandPosition);
    }

    async getProductAttachments(): Promise<{
        attachmentsCount: number | undefined;
        questionsHash: string | undefined;
        answersHash: string | undefined;
    }> {
        if (!this._productPositionInStorage) {
            this._productPositionInStorage = this._calcProductPositionInStorage();
        }

        const emptyResult = {
            attachmentsCount: undefined,
            questionsHash: undefined,
            answersHash: undefined
        };

        const attachmentsArrayPosition = this._getIndexRelativeTo(
            this._productPositionInStorage,
            2
        ); // e.g. "0x180c3e3c7be7d2f873f5bc90322650ab3fd8267dee346423a18eb27c01c52f74";
        const attachmentsCount = parseInt(
            await this._getFromStorageAt(attachmentsArrayPosition),
            16
        );
        if (attachmentsCount % 2 !== 0) {
            console.log(
                "attachment count is unexpectedly NOT multiple of 2 - big chance of an error!"
            );
            return emptyResult;
        }

        if (attachmentsCount < 2) {
            console.log(
                "attachment count is unexpectedly less than 2 - big chance of an error!"
            );
            return emptyResult;
        }

        // `attachmentsArrayPosition` has to be hashed to access dynamic array elements
        const firstAttachmentPosition = this.web3.utils.sha3(attachmentsArrayPosition); // e.g. "0x0ec16cbba091821a44d6a45572348c274437f4d777a86395241b0cc45475b455"

        const lastQuestionsPosition = this._getIndexRelativeTo(
            firstAttachmentPosition,
            attachmentsCount - 2
        ); // the pre-last element of `attachments` array
        const questionsHash = await this._getFromStorageAt(lastQuestionsPosition);
        // questionsHash should be the same as was at the moment of product saving into BC

        const lastAnswersPosition = this._getIndexRelativeTo(
            firstAttachmentPosition,
            attachmentsCount - 1
        ); // the last element of `attachments` array
        const answersHash = await this._getFromStorageAt(lastAnswersPosition);
        // answersHash should be the same as was at the moment of product saving into BC

        return { attachmentsCount, questionsHash, answersHash };
    }

    /** Calculate the product position to be passes as the secont param into web3.eth.getStorageAt.
     * @returns productPositionInStorage - the position which in fact points to the first field of the ProductStruct (id),
     * i.e. productId = await this._getFromStorageAt(productPositionInStorage).
     * To extract other field(s) - a proper offset should be applied:
     * struct ProductStruct {
     *   uint id;              // productPositionInStorage
     *   uint brand;           // productPositionInStorage + 1
     *   uint[] attachments;   // productPositionInStorage + 2 (only array length here)
     *   uint requested;       // productPositionInStorage + 3
     * }
     */
    _calcProductPositionInStorage() {
        const productsMappingSlotInContract = "1"; // See Product.sol
        const productIdConcatMappingSlot =
            this._productId.padStart(64, "0") +
            productsMappingSlotInContract.padStart(64, "0"); // e.g. "0x9585c0822c57bd4c269f463e87b51c7bd48d53d10add50c975e332cf3a66c7740000000000000000000000000000000000000000000000000000000000000001"
        return this.web3.utils.sha3(productIdConcatMappingSlot); // e.g. "0x180c3e3c7be7d2f873f5bc90322650ab3fd8267dee346423a18eb27c01c52f72"
    }

    _getIndexRelativeTo(index: string | null, offset: number) {
        const indexPlusOffset = BigInt(index) + BigInt(offset.toString());
        return "0x" + BigInt(indexPlusOffset).toString(16);
    }
}
