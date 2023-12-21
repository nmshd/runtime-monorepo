import { NativePlatform } from "@js-soft/native-abstractions"
import { AppConfig, createAppConfig } from "@vermascht/app-runtime"
import { IConfigOverwrite } from "@vermascht/transport"
import { AppRelationshipFacadeTest, MessageFacadeTest, UIBridgeTest } from "./extensibility"
import { MessageEventingTest, RelationshipEventingAcceptTest, RelationshipEventingRejectTest } from "./modules"
import { RelationshipEventingRevokeTest } from "./modules/RelationshipEventingRevoke.test"
import {
    AccountNameTest,
    AppStringProcessorTest,
    RuntimeModuleLoadingTest,
    StartupTest,
    TranslationProviderTest
} from "./runtime"

export class Test {
    public static currentPlatform: NativePlatform

    public static getConfig(): AppConfig {
        const notDefinedEnvironmentVariables = [
            "NMSHD_TEST_BASEURL",
            "NMSHD_TEST_CLIENTID",
            "NMSHD_TEST_CLIENTSECRET"
        ].filter((env) => !process.env[env])

        if (notDefinedEnvironmentVariables.length > 0) {
            throw new Error(`Missing environment variable(s): ${notDefinedEnvironmentVariables.join(", ")}}`)
        }

        const transportOverride: Omit<IConfigOverwrite, "supportedIdentityVersion"> = {
            baseUrl: globalThis.process.env.NMSHD_TEST_BASEURL!,
            platformClientId: globalThis.process.env.NMSHD_TEST_CLIENTID!,
            platformClientSecret: globalThis.process.env.NMSHD_TEST_CLIENTSECRET!,
            debug: true
        }

        if (typeof (globalThis as any).window !== "undefined" && !(globalThis as any).isCordovaApp) {
            Test.currentPlatform = NativePlatform.Web
            transportOverride.baseUrl = "/svc"
        } else {
            Test.currentPlatform = NativePlatform.Node
        }

        return createAppConfig({
            transportLibrary: transportOverride,
            logging: {},
            applicationId: "eu.enmeshed.test"
        })
    }

    public static runIntegrationTests(): void {
        const config = this.getConfig()

        new MessageEventingTest(config).run()
        new RelationshipEventingAcceptTest(config).run()
        new RelationshipEventingRejectTest(config).run()
        new RelationshipEventingRevokeTest(config).run()
        new StartupTest(config).run()

        new MessageFacadeTest(config).run()
        new AppRelationshipFacadeTest(config).run()
        new AccountNameTest(config).run()
        new RuntimeModuleLoadingTest(config).run()
        new TranslationProviderTest(config).run()
        new UIBridgeTest(config).run()
        new AppStringProcessorTest(config).run()
    }
}
