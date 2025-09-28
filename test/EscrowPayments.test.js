const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EscrowPayments", function () {
  it("should handle booking and completing an appointment", async function () {
    const [admin, patient, doctor] = await ethers.getSigners();
    const doctorAddr = await doctor.getAddress();

    const EscrowFactory = await ethers.getContractFactory("EscrowPayments");
    const escrow = await EscrowFactory.deploy();
    await escrow.waitForDeployment();

    const escrowWithMethods = escrow;

    const bookTx = await escrowWithMethods.connect(patient).bookAppointment(doctorAddr, {
      value: ethers.parseEther("1")
    });
    const bookReceipt = await bookTx.wait();

    const bookedEvent = bookReceipt.logs.map((log) => {
      try {
        return escrow.interface.parseLog(log);
      } catch {
        return null;
      }
    }).find((parsed) => parsed && parsed.name === "AppointmentBooked");

    expect(bookedEvent).to.not.be.undefined;
    const appointmentId = bookedEvent.args.appointmentId || bookedEvent.args[0];

    await escrowWithMethods.connect(patient).completeAppointment(appointmentId);
    const appt = await escrowWithMethods.appointments(appointmentId);
    expect(appt.status).to.equal(1);
  });
});