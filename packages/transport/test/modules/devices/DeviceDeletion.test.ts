import { AccountController } from "@vermascht/transport"
import { expect } from "chai"
import { AbstractTest, AppDeviceTest, DeviceTestParameters } from "../../testHelpers"

export class DeviceDeletionTest extends AbstractTest {
    public run(): void {
        const that = this

        describe("Device Deletion", function () {
            let deviceTest: AppDeviceTest

            let accountController: AccountController

            this.timeout(150000)

            before(async function () {
                const parameters = new DeviceTestParameters(
                    { ...that.config, datawalletEnabled: true },
                    that.connection,
                    that.loggerFactory
                )
                deviceTest = new AppDeviceTest(parameters)

                await deviceTest.init()

                accountController = await deviceTest.createAccount()
            })

            afterEach(async function () {
                await accountController.syncDatawallet()
            })

            after(async function () {
                await deviceTest.close()
            })

            it("should delete a newly created device", async function () {
                const newDevice = await accountController.devices.sendDevice({ name: "Test1", isAdmin: true })

                await accountController.devices.delete(newDevice)

                const devices = await accountController.devices.list()
                const deviceIds = devices.map((d) => d.id.toString())
                expect(deviceIds).to.not.contain(newDevice.id.toString())
            })

            it("should not delete an already onboarded device rejected by backbone", async function () {
                const newDevice = await accountController.devices.sendDevice({ name: "Test2", isAdmin: true })
                await accountController.syncDatawallet()
                await deviceTest.onboardDevice(await accountController.devices.getSharedSecret(newDevice.id))

                await expect(accountController.devices.delete(newDevice)).to.be.rejectedWith(
                    "Could not delete device: Backbone did not authorize deletion."
                )

                const devices = await accountController.devices.list()
                const deviceIds = devices.map((d) => d.id.toString())
                expect(deviceIds).to.contain(newDevice.id.toString())
            })

            it("should not delete an already onboarded device", async function () {
                const newDevice = await accountController.devices.sendDevice({ name: "Test3", isAdmin: true })
                await accountController.syncDatawallet()
                await deviceTest.onboardDevice(await accountController.devices.getSharedSecret(newDevice.id))
                await accountController.syncDatawallet()

                const deviceToDelete = await accountController.devices.get(newDevice.id)
                await expect(accountController.devices.delete(deviceToDelete!)).to.be.rejectedWith(
                    "Could not delete device: Device is already onboarded."
                )

                const devices = await accountController.devices.list()
                const deviceIds = devices.map((d) => d.id.toString())
                expect(deviceIds).to.contain(newDevice.id.toString())
            })
        })
    }
}
