import { CoreBuffer, CryptoSecretKey, CryptoSignaturePrivateKey } from "@nmshd/crypto"
import {
    AccountController,
    CoreDate,
    CoreId,
    Device,
    DeviceSecretCredentials,
    DeviceSecretType,
    DeviceSharedSecret
} from "@vermascht/transport"
import { expect } from "chai"
import { AbstractTest, AppDeviceTest, DeviceTestParameters, TestUtil } from "../../testHelpers"

export class DeviceOnboardingTest extends AbstractTest {
    public run(): void {
        const that = this

        describe("Device Onboarding", function () {
            let deviceTest: AppDeviceTest

            let device1Account: AccountController
            let device2Account: AccountController

            let newDevice: Device
            let sharedSecret: DeviceSharedSecret

            this.timeout(150000)

            before(async function () {
                const parameters = new DeviceTestParameters(
                    { ...that.config, datawalletEnabled: true },
                    that.connection,
                    that.loggerFactory
                )
                deviceTest = new AppDeviceTest(parameters)

                await deviceTest.init()

                device1Account = await deviceTest.createAccount()
            })

            it("should create correct device", async function () {
                newDevice = await device1Account.devices.sendDevice({ name: "Test", isAdmin: true })
                await device1Account.syncDatawallet()
                expect(newDevice).instanceOf(Device)
                expect(newDevice.name).equals("Test")
                expect(newDevice.publicKey).to.not.exist
                expect(newDevice.operatingSystem).to.not.exist
                expect(newDevice.lastLoginAt).to.not.exist
                expect(newDevice.initialPassword!.length).below(51).above(44)
                expect(newDevice.username).to.exist
                expect(newDevice.id).instanceOf(CoreId)
                expect(newDevice.createdAt).instanceOf(CoreDate)
                expect(newDevice.createdByDevice).instanceOf(CoreId)
                expect(newDevice.createdByDevice.toString()).equals(device1Account.activeDevice.id.toString())
            })

            it("should list all devices correctly", async function () {
                const devices = await device1Account.devices.list()
                expect(devices).to.be.of.length(2)
                expect(devices[0].id.toString()).equals(device1Account.activeDevice.id.toString())
                expect(devices[1].id.toString()).equals(newDevice.id.toString())
            })

            it("should create correct device shared secret", async function () {
                sharedSecret = await device1Account.activeDevice.secrets.createDeviceSharedSecret(newDevice, 1, true)
                expect(sharedSecret).instanceOf(DeviceSharedSecret)
                expect(sharedSecret.id.toString()).equals(newDevice.id.toString())
                expect(JSON.stringify(sharedSecret.identity.toJSON(false))).equals(
                    JSON.stringify(device1Account.identity.identity.toJSON(false))
                )
                expect(sharedSecret.username).equals(newDevice.username)
                expect(sharedSecret.password).equals(newDevice.initialPassword)
                expect(sharedSecret.synchronizationKey).instanceOf(CryptoSecretKey)
                expect(sharedSecret.identityPrivateKey).instanceOf(CryptoSignaturePrivateKey)
            })

            it("should create correct device shared secret via controller", async function () {
                sharedSecret = await device1Account.devices.getSharedSecret(newDevice.id)
                expect(sharedSecret).instanceOf(DeviceSharedSecret)
                expect(sharedSecret.id.toString()).equals(newDevice.id.toString())
                expect(JSON.stringify(sharedSecret.identity.toJSON(false))).equals(
                    JSON.stringify(device1Account.identity.identity.toJSON(false))
                )
                expect(sharedSecret.username).equals(newDevice.username)
                expect(sharedSecret.password).equals(newDevice.initialPassword)
                expect(sharedSecret.synchronizationKey).instanceOf(CryptoSecretKey)
                expect(sharedSecret.identityPrivateKey).instanceOf(CryptoSignaturePrivateKey)
            })

            it("should serialize device shared secrets and deserialize them again", function () {
                const serialized = sharedSecret.serialize()
                sharedSecret = DeviceSharedSecret.deserialize(serialized)
                expect(sharedSecret).instanceOf(DeviceSharedSecret)
                expect(sharedSecret.id.toString()).equals(newDevice.id.toString())
                expect(JSON.stringify(sharedSecret.identity.toJSON(false))).equals(
                    JSON.stringify(device1Account.identity.identity.toJSON(false))
                )
                expect(sharedSecret.username).equals(newDevice.username)
                expect(sharedSecret.password).equals(newDevice.initialPassword)
                expect(sharedSecret.synchronizationKey).instanceOf(CryptoSecretKey)
                expect(sharedSecret.identityPrivateKey).instanceOf(CryptoSignaturePrivateKey)
            })

            it("should onboard new device with device shared secret", async function () {
                device2Account = await deviceTest.onboardDevice(sharedSecret)
                expect(device2Account).instanceOf(AccountController)
            })

            it("should be able to login after a device onboarding", async function () {
                await device2Account.init()
                expect(device2Account).instanceOf(AccountController)
            })

            it("should own the same identity", function () {
                expect(device1Account.identity.identity.toBase64()).equals(device2Account.identity.identity.toBase64())
            })

            it("should be able to sign for the existing identity", async function () {
                const testBuffer = CoreBuffer.fromUtf8("Test")
                const dev1Signature = await device1Account.identity.sign(testBuffer)
                const dev2Check = await device2Account.identity.verify(testBuffer, dev1Signature)
                expect(dev2Check).to.be.true
                const dev2Signature = await device2Account.identity.sign(testBuffer)
                const dev1Check = await device1Account.identity.verify(testBuffer, dev2Signature)
                expect(dev1Check).to.be.true
            })

            it("should have created a new device keypair", async function () {
                const testBuffer = CoreBuffer.fromUtf8("Test")
                const dev2Signature = await device2Account.activeDevice.sign(testBuffer)
                const dev2Check = await device2Account.activeDevice.verify(testBuffer, dev2Signature)
                expect(dev2Check).to.be.true

                const dev1Check = await device1Account.activeDevice.verify(testBuffer, dev2Signature)
                expect(dev1Check).to.be.false

                const dev1Container = await device1Account.activeDevice.secrets.loadSecret(
                    DeviceSecretType.DeviceSignature
                )
                const dev1Key = dev1Container!.secret as CryptoSignaturePrivateKey
                expect(dev1Key).instanceOf(CryptoSignaturePrivateKey)
                const dev2Container = await device2Account.activeDevice.secrets.loadSecret(
                    DeviceSecretType.DeviceSignature
                )
                const dev2Key = dev2Container!.secret as CryptoSignaturePrivateKey
                expect(dev2Key).instanceOf(CryptoSignaturePrivateKey)
                expect(dev1Key.toBase64()).to.not.equal(dev2Key.toBase64())
            })

            it("should own the same synchronization key", async function () {
                const dev1Container = await device2Account.activeDevice.secrets.loadSecret(
                    DeviceSecretType.IdentitySignature
                )
                const dev1Key = dev1Container!.secret as CryptoSignaturePrivateKey
                expect(dev1Key).instanceOf(CryptoSignaturePrivateKey)
                const dev2Container = await device2Account.activeDevice.secrets.loadSecret(
                    DeviceSecretType.IdentitySignature
                )
                const dev2Key = dev2Container!.secret as CryptoSignaturePrivateKey
                expect(dev2Key).instanceOf(CryptoSignaturePrivateKey)
                expect(dev1Key.toBase64()).to.equal(dev2Key.toBase64())
            })

            it("should have different onboarding credentials", async function () {
                const dev1Container = await device1Account.activeDevice.secrets.loadSecret(
                    DeviceSecretType.DeviceCredentials
                )
                const dev1Key = dev1Container!.secret as DeviceSecretCredentials
                expect(dev1Key).instanceOf(DeviceSecretCredentials)

                const dev2Container = await device2Account.activeDevice.secrets.loadSecret(
                    DeviceSecretType.DeviceCredentials
                )
                const dev2Key = dev2Container!.secret as DeviceSecretCredentials
                expect(dev2Key).instanceOf(DeviceSecretCredentials)

                expect(dev1Key.id).not.equals(dev2Key.id)
                expect(dev1Key.username).not.equals(dev2Key.username)
                expect(dev1Key.password).not.equals(dev2Key.password)
            })

            it("should have changed the password of the created device (locally)", async function () {
                const dev1Container = await device1Account.activeDevice.secrets.loadSecret(
                    DeviceSecretType.DeviceCredentials
                )
                const dev1Key = dev1Container!.secret as DeviceSecretCredentials
                expect(dev1Key).instanceOf(DeviceSecretCredentials)

                expect(dev1Key.password).not.equals(newDevice.initialPassword)
            })

            it("should have changed the password of the created device (backbone)", async function () {
                TestUtil.useFatalLoggerFactory()

                await TestUtil.expectThrowsAsync(async () => {
                    await deviceTest.onboardDevice(sharedSecret)
                }, "error.transport.request.noAuthGrant")
            })

            after(async function () {
                await deviceTest.close()
            })
        })
    }
}
