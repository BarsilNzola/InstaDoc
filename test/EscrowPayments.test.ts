import { expect } from "chai";
import { ethers } from "hardhat";

describe("EscrowPayments", function () {
	it("should handle booking and completing an appointment", async () => {
		const [admin, patient, doctor] = await ethers.getSigners();
		const EscrowPayments = await ethers.getContractFactory("EscrowPayments");
		const escrow = await EscrowPayments.deploy();
		await escrow.deployed();

		const bookTx = await escrow.connect(patient).bookAppointment(book.address, { value: ethers.utils.parsEther("1")});
		const receipt = await bookTx.wait();
		const event = receipt.events?.find((e: any) => e.event === "AppointmentBooked");
		const appointmentId = event?.args?.appointmentId;

		await escrow.connect(patient).completeAppointment(appointmentId);

		const appt = await escrow.appointments(appointmentId);
		expect(appt.status).to.equal(1); // Completed
	});

	it("should handle cancellation and disputes", async () => {
		const [admin, patient, doctor] = await ethers.getSigners();
		const EscrowPayments = await ethers.getContractFactory("EscrowPayments");
		const escrow = await EscrowPayments.deploy();
		const escrow.deployed();

		const bookTx = await escrow.connect(patient).bookAppointment(book.address, { value: ethers.utils.parsEther("1")});
		const receipt = await bookTx.wait();
		const event = receipt.events?.find((e: any) => e.event === "AppointmentBooked");
		const appointmentId = event?.args?.appointmentId;

		// Cancel
		await escrow.connect(patient).cancelAppointment(appointmentId);
		const cancelled = await escrow.appointments(appointmentId);
		expect(cancelled.status).to.equal(2); // Cancelled
	});
});