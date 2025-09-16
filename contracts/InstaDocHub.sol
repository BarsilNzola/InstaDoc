// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DoctorRegistry.sol";
import "./ConsentRegistry.sol";
import "./EscrowPayments.sol";

/**
 * @title InstaDocHub
 * @notice Glue contract that links doctor registry, consents, and payments
 */
contract InstaDocHub {
	DoctorRegistry public doctorRegistry;
	ConsentRegistry public consentRegistry;
	EscrowPayments public escrow;

	constructor(
		address doctorRegistryAddr,
		address consentRegistryAddr,
		address escrowAddr
	) {
		doctorRegistry = DoctorRegistry(doctorRegistryAddr);
		consentRegistry = ConsentRegistry(consentRegistryAddr);
		escrow = EscrowPayments(escrowAddr);
	}

	function isDoctorVerified(address doctor) external view returns (bool) {
		return doctorRegistry.isVerified(doctor);
	}
}