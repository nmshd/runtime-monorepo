import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions"
import { ILoggerFactory } from "@js-soft/logging-abstractions"
import { IConfigOverwrite } from "@vermascht/transport"
import { AuthenticationTest, PaginatorTest, RESTClientTest } from "./core/backbone"
import { End2EndTest } from "./end2end"
import {
    AccountControllerTest,
    AttachmentTest,
    CertificateIssuerTest,
    ChallengesTest,
    DeviceDeletionTest,
    DeviceOnboardingTest,
    FileControllerTest,
    FileReferenceTest,
    FileSyncTest,
    ListRelationshipMessagesTest,
    MessageContentTest,
    MessageControllerTest,
    MessageSyncTest,
    PublicAPITest,
    RejectAcceptTest,
    RelationshipSyncTest,
    RelationshipTemplateControllerTest,
    RelationshipTemplateReferenceTest,
    RelationshipsControllerTest,
    RelationshipsCustomContentTest,
    SecretControllerTest,
    SyncControllerCallbackTest,
    SyncControllerTest,
    TimeSyncTest,
    TokenContentTest,
    TokenControllerTest,
    TokenReferenceTest,
    TokenSyncTest
} from "./modules"
import { CryptoTest, DateTest, IdentityGeneratorTest, PasswordGeneratorTest, RandomTest, ReflectionTest } from "./utils"

export * from "./end2end"
export * from "./utils"

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

    public static runUnitTests(loggerFactory: ILoggerFactory): void {
        new ReflectionTest(loggerFactory).run()
        new PasswordGeneratorTest(loggerFactory).run()
        new RandomTest(loggerFactory).run()
        new CryptoTest(loggerFactory).run()
        new DateTest(loggerFactory).run()
        new IdentityGeneratorTest(loggerFactory).run()
    }

    public static runIntegrationTests(
        config: IConfigOverwrite,
        databaseConnection: IDatabaseConnection,
        loggerFactory: ILoggerFactory
    ): void {
        new AccountControllerTest(config, databaseConnection, loggerFactory).run()
        new MessageSyncTest(config, databaseConnection, loggerFactory).run()
        new TokenSyncTest(config, databaseConnection, loggerFactory).run()
        new FileSyncTest(config, databaseConnection, loggerFactory).run()
        new RelationshipSyncTest(config, databaseConnection, loggerFactory).run()
        new SyncControllerTest(config, databaseConnection, loggerFactory).run()
        new SyncControllerCallbackTest(config, databaseConnection, loggerFactory).run()
        new MessageContentTest(config, databaseConnection, loggerFactory).run()
        new TimeSyncTest(config, databaseConnection, loggerFactory).run()
        new DeviceOnboardingTest(config, databaseConnection, loggerFactory).run()
        new DeviceDeletionTest(config, databaseConnection, loggerFactory).run()
        new RelationshipsCustomContentTest(config, databaseConnection, loggerFactory).run()
        new FileReferenceTest(config, databaseConnection, loggerFactory).run()
        new TokenContentTest(config, databaseConnection, loggerFactory).run()
        new TokenReferenceTest(config, databaseConnection, loggerFactory).run()
        new RelationshipTemplateReferenceTest(config, databaseConnection, loggerFactory).run()
        new RelationshipsControllerTest(config, databaseConnection, loggerFactory).run()
        new RelationshipTemplateControllerTest(config, databaseConnection, loggerFactory).run()
        new MessageControllerTest(config, databaseConnection, loggerFactory).run()
        new FileControllerTest(config, databaseConnection, loggerFactory).run()
        new TokenControllerTest(config, databaseConnection, loggerFactory).run()
        new PublicAPITest(config, databaseConnection, loggerFactory).run()
        new AttachmentTest(config, databaseConnection, loggerFactory).run()
        new End2EndTest(config, databaseConnection, loggerFactory).run()
        new AuthenticationTest(config, databaseConnection, loggerFactory).run()
        new SecretControllerTest(config, databaseConnection, loggerFactory).run()
        new ChallengesTest(config, databaseConnection, loggerFactory).run()
        new CertificateIssuerTest(config, databaseConnection, loggerFactory).run()
        new ListRelationshipMessagesTest(config, databaseConnection, loggerFactory).run()
        new RejectAcceptTest(config, databaseConnection, loggerFactory).run()
        new PaginatorTest(config, databaseConnection, loggerFactory).run()
        new RESTClientTest(config, databaseConnection, loggerFactory).run()
    }
}
