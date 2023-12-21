import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions"
import { ILoggerFactory } from "@js-soft/logging-abstractions"
import { IConfigOverwrite } from "@vermascht/transport"
import { AttributeListenersControllerTest } from "./modules/attributeListeners/AttributeListenersController.test"
import { AttributesControllerTest } from "./modules/attributes/AttributesController.test"
import { LocalAttributeShareInfoTest } from "./modules/attributes/LocalAttributeShareInfo.test"
import { NotificationEnd2End } from "./modules/notifications/NotificationEnd2End.test"
import { PeerSharedAttributeSucceededNotificationItemProcessorTest } from "./modules/notifications/attributeSucceeded/PeerSharedAttributeSucceededNotificationItemProcessor.test"
import { LocalNotificationTest } from "./modules/notifications/local/LocalNotification.test"
import { DecideRequestParametersValidatorTests } from "./modules/requests/DecideRequestParamsValidator.test"
import { GenericRequestItemProcessorTests } from "./modules/requests/GenericRequestItemProcessor.test"
import { IncomingRequestControllerTests } from "./modules/requests/IncomingRequestsController.test"
import { OutgoingRequestsControllerTests } from "./modules/requests/OutgoingRequestsController.test"
import { RequestEnd2EndTests } from "./modules/requests/RequestEnd2End.test"
import { RequestItemProcessorRegistryTests } from "./modules/requests/RequestItemProcessorRegistry.test"
import { CreateAttributeRequestItemProcessorTests } from "./modules/requests/itemProcessors/createAttribute/CreateAttributeRequestItemProcessor.test"
import { FreeTextRequestItemProcessorTest } from "./modules/requests/itemProcessors/freeText/FreeTextRequestItemProcessor.test"
import { ProposeAttributeRequestItemProcessorTests } from "./modules/requests/itemProcessors/proposeAttribute/ProposeAttributeRequestItemProcessor.test"
import { ReadAttributeRequestItemProcessorTests } from "./modules/requests/itemProcessors/readAttribute/ReadAttributeRequestItemProcessor.test"
import { RegisterAttributeListenerRequestItemProcessorTests } from "./modules/requests/itemProcessors/registerAttributeListener/RegisterAttributeListenerRequestItemProcessor.test"
import { ShareAttributeRequestItemProcessorTests } from "./modules/requests/itemProcessors/shareAttribute/ShareAttributeRequestItemProcessor.test"
import { LocalRequestTest } from "./modules/requests/local/LocalRequest.test"
import setup from "./setup"

export class Test {
    public static get config(): IConfigOverwrite {
        const notDefinedEnvironmentVariables = [
            "NMSHD_TEST_BASEURL",
            "NMSHD_TEST_CLIENTID",
            "NMSHD_TEST_CLIENTSECRET"
        ].filter((env) => !process.env[env])

        if (notDefinedEnvironmentVariables.length > 0) {
            throw new Error(`Missing environment variable(s): ${notDefinedEnvironmentVariables.join(", ")}}`)
        }

        return {
            baseUrl: globalThis.process.env.NMSHD_TEST_BASEURL!,
            platformClientId: globalThis.process.env.NMSHD_TEST_CLIENTID!,
            platformClientSecret: globalThis.process.env.NMSHD_TEST_CLIENTSECRET!,
            debug: true,
            supportedIdentityVersion: 1
        }
    }

    private static setupDone = false
    private static doSetup(): void {
        if (this.setupDone) return

        setup()
        this.setupDone = true
    }

    public static runIntegrationTests(
        config: IConfigOverwrite,
        databaseConnection: IDatabaseConnection,
        logger: ILoggerFactory
    ): void {
        this.doSetup()
        new AttributesControllerTest(config, databaseConnection, logger).run()
        new PeerSharedAttributeSucceededNotificationItemProcessorTest(config, databaseConnection, logger).run()
        new RequestEnd2EndTests(config, databaseConnection, logger).run()
        new OutgoingRequestsControllerTests(config, databaseConnection, logger).run()
        new IncomingRequestControllerTests(config, databaseConnection, logger).run()
        new ReadAttributeRequestItemProcessorTests(config, databaseConnection, logger).run()
        new ShareAttributeRequestItemProcessorTests(config, databaseConnection, logger).run()
        new CreateAttributeRequestItemProcessorTests(config, databaseConnection, logger).run()
        new ProposeAttributeRequestItemProcessorTests(config, databaseConnection, logger).run()
        new RequestItemProcessorRegistryTests(config, databaseConnection, logger).run()
        new GenericRequestItemProcessorTests(config, databaseConnection, logger).run()
        new AttributeListenersControllerTest(config, databaseConnection, logger).run()
        new RegisterAttributeListenerRequestItemProcessorTests(config, databaseConnection, logger).run()
        new FreeTextRequestItemProcessorTest(config, databaseConnection, logger).run()
        new NotificationEnd2End(config, databaseConnection, logger).run()
    }

    public static runUnitTests(logger: ILoggerFactory): void {
        this.doSetup()
        new LocalRequestTest(logger).run()
        new LocalNotificationTest(logger).run()
        new LocalAttributeShareInfoTest(logger).run()
        new DecideRequestParametersValidatorTests(logger).run()
    }
}
