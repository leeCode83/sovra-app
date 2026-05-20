// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ICaveatEnforcer} from "./interfaces/ICaveatEnforcer.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract SovraConsentEnforcer is ICaveatEnforcer, Ownable {
    error ConsentAlreadyRevoked();
    error ConsentExpired();
    error MaxUsesExceeded();
    error InvalidRedeemer();
    error InvalidTermsLength();
    error UnauthorizedInstitution();
    error NotAuthorizedToRevoke();

    event ConsentRevoked(bytes32 indexed consentId);
    event DelegationUsed(bytes32 indexed delegationHash, uint256 remainingUses);
    event InstitutionAdded(address indexed institution);
    event InstitutionRemoved(address indexed institution);

    /// @notice Maps consentId to revocation status
    mapping(bytes32 => bool) public revoked;

    /// @notice Maps delegation hash to usage count
    mapping(bytes32 => uint256) public usageCount;

    /// @notice Set of authorized research institutions
    mapping(address => bool) public authorizedInstitutions;

    /// @notice Maps consentId to the patient address who owns the consent
    mapping(bytes32 => address) public consentOwners;

    /// @notice Array of authorized institution addresses for enumeration
    address[] private _authorizedList;

    constructor(address _initialOwner) Ownable(_initialOwner) {}

    /// @notice Revoke a consent on-chain. Callable by patient (consent owner) or contract owner.
    function revokeConsent(bytes32 consentId) external {
        if (msg.sender != consentOwners[consentId] && msg.sender != owner()) {
            revert NotAuthorizedToRevoke();
        }
        revoked[consentId] = true;
        emit ConsentRevoked(consentId);
    }

    /// @notice Check if a consent is valid (not revoked)
    function isValid(bytes32 consentId) external view returns (bool) {
        return !revoked[consentId];
    }

    /// @notice Set the patient address who owns a consent. Only callable by contract owner.
    function setConsentOwner(bytes32 consentId, address patient) external onlyOwner {
        consentOwners[consentId] = patient;
    }

    /// @notice Add an authorized institution. Only callable by contract owner.
    function addInstitution(address institution) external onlyOwner {
        if (!authorizedInstitutions[institution]) {
            authorizedInstitutions[institution] = true;
            _authorizedList.push(institution);
            emit InstitutionAdded(institution);
        }
    }

    /// @notice Remove an authorized institution. Only callable by contract owner.
    function removeInstitution(address institution) external onlyOwner {
        if (authorizedInstitutions[institution]) {
            authorizedInstitutions[institution] = false;
            emit InstitutionRemoved(institution);
        }
    }

    /// @notice Get count of authorized institutions
    function authorizedInstitutionsCount() external view returns (uint256) {
        return _authorizedList.length;
    }

    /**
     * ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
     * ┃  ICaveatEnforcer Hooks                                    ┃
     * ┃                                                            ┃
     * ┃  Terms schema: abi.encode(consentId, dataScope, expiresAt, ┃
     * ┃                  maxUses, institutions)                     ┃
     * ┃    - consentId (bytes32): unique consent identifier         ┃
     * ┃    - dataScope (string): comma-separated allowed data types ┃
     * ┃    - expiresAt (uint48): unix timestamp (0 = never)         ┃
     * ┃    - maxUses (uint32): max redeems (0 = unlimited)          ┃
     * ┃    - institutions (address[]): authorized institution addrs ┃
     * ┃                                                            ┃
     * ┃  Args schema: abi.encode(targetAddress, dataPointer)        ┃
     * ┃    - targetAddress (address): where execution is allowed    ┃
     * ┃    - dataPointer (string): specific data being accessed     ┃
     * ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
     */

    function beforeAllHook(
        bytes calldata _terms,
        bytes calldata
    ) external view override returns (bytes memory) {
        if (_terms.length < 128) revert InvalidTermsLength();

        (bytes32 consentId,, uint48 expiresAt,, address[] memory institutions) = abi.decode(
            _terms,
            (bytes32, string, uint48, uint32, address[])
        );

        if (revoked[consentId]) revert ConsentAlreadyRevoked();
        if (expiresAt != 0 && expiresAt <= block.timestamp) revert ConsentExpired();

        for (uint256 i = 0; i < institutions.length; i++) {
            if (!authorizedInstitutions[institutions[i]]) revert UnauthorizedInstitution();
        }

        return _terms;
    }

    function beforeHook(
        address _redeemer,
        bytes calldata,
        bytes calldata
    ) external pure override returns (bytes memory) {
        if (_redeemer == address(0)) revert InvalidRedeemer();
        return abi.encode(_redeemer);
    }

    function afterHook(
        bytes calldata _terms,
        bytes calldata
    ) external override returns (bytes memory) {
        if (_terms.length < 128) return _terms;

        (, , , uint32 maxUses,) = abi.decode(
            _terms,
            (bytes32, string, uint48, uint32, address[])
        );
        if (maxUses == 0) return _terms;

        bytes32 delegationHash = keccak256(_terms);
        usageCount[delegationHash]++;

        uint256 currentUses = usageCount[delegationHash];
        if (currentUses > maxUses) revert MaxUsesExceeded();

        emit DelegationUsed(delegationHash, maxUses - currentUses);
        return _terms;
    }

    function afterAllHook(
        bytes calldata,
        bytes calldata
    ) external pure override returns (bytes memory) {
        return "";
    }
}
