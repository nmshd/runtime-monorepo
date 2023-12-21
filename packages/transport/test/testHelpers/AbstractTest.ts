import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions"
import { ILogger, ILoggerFactory } from "@js-soft/logging-abstractions"
import { EventBus, EventEmitter2EventBus } from "@js-soft/ts-utils"
import { AccountController, IConfigOverwrite, Transport } from "@vermascht/transport"
import { DurationLike } from "luxon"
import { TestUtil } from "../testHelpers"

export abstract class AbstractTest {
    protected logger: ILogger
    protected eventBus: EventBus

    public readonly tempDateThreshold: DurationLike = { seconds: 30 }

    public constructor(
        protected config: IConfigOverwrite,
        protected connection: IDatabaseConnection,
        protected loggerFactory: ILoggerFactory
    ) {
        this.logger = this.loggerFactory.getLogger(this.constructor.name)
        this.eventBus = new EventEmitter2EventBus(() => {
            // ignore errors
        })
    }

    public abstract run(): void

    protected async createIdentityWithTwoDevices(): Promise<{
        device1: AccountController
        device2: AccountController
    }> {
        // Create Device1 Controller
        const transport: Transport = new Transport(this.connection, this.config, this.eventBus, this.loggerFactory)
        await transport.init()
        const device1Account = await TestUtil.createAccount(transport)

        // Prepare Device2
        const device2 = await device1Account.devices.sendDevice({ name: "Device2" })
        const sharedSecret = await device1Account.activeDevice.secrets.createDeviceSharedSecret(device2, 1, true)
        await device1Account.syncDatawallet()

        // Create Device2 Controller
        const device2Account = await TestUtil.onboardDevice(transport, sharedSecret)

        await device1Account.syncEverything()
        await device2Account.syncEverything()

        return { device1: device1Account, device2: device2Account }
    }

    protected async createIdentityWithOneDevice(): Promise<AccountController> {
        const transport: Transport = new Transport(this.connection, this.config, this.eventBus, this.loggerFactory)
        await transport.init()
        const deviceAccount = await TestUtil.createAccount(transport)
        return deviceAccount
    }

    protected async createIdentityWithNDevices(n: number): Promise<AccountController[]> {
        const transport: Transport = new Transport(this.connection, this.config, this.eventBus, this.loggerFactory)
        await transport.init()
        const device1Account = await TestUtil.createAccount(transport)

        const devices = [device1Account]

        for (let i = 0; i < n - 1; i++) {
            const device2 = await device1Account.devices.sendDevice({ name: `Device${i + 2}` })
            const sharedSecret = await device1Account.activeDevice.secrets.createDeviceSharedSecret(
                device2,
                n + 1,
                true
            )
            await device1Account.syncDatawallet()

            // Create Device2 Controller
            const device2Account = await TestUtil.onboardDevice(transport, sharedSecret)

            devices.push(device2Account)
        }

        for (const device of devices) {
            await device.syncDatawallet()
        }

        return devices
    }
}
