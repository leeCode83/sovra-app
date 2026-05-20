// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ICaveatEnforcer {
    function beforeAllHook(
        bytes calldata _terms,
        bytes calldata _args
    ) external returns (bytes memory);

    function beforeHook(
        address _redeemer,
        bytes calldata _terms,
        bytes calldata _args
    ) external returns (bytes memory);

    function afterHook(
        bytes calldata _terms,
        bytes calldata _args
    ) external returns (bytes memory);

    function afterAllHook(
        bytes calldata _terms,
        bytes calldata _args
    ) external returns (bytes memory);
}
