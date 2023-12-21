import { RuntimeConfig } from "@vermascht/runtime"
import { IConfigOverwrite, Realm } from "@vermascht/transport"
import { defaultsDeep } from "lodash"

export interface AppConfig extends RuntimeConfig {
    logging: any
    accountsDbName: string
    applicationId: string
    applePushEnvironment?: "Development" | "Production"
}

export interface AppConfigOverwrite {
    transportLibrary?: Omit<IConfigOverwrite, "supportedIdentityVersion">
    logging?: any
    accountsDbName?: string
    applicationId: string
    applePushEnvironment?: "Development" | "Production"
}

export function createAppConfig(...configs: AppConfigOverwrite[]): AppConfig {
    const appConfig = {
        accountsDbName: "accounts",
        transportLibrary: {
            realm: Realm.Prod,
            datawalletEnabled: true
        },
        modules: {
            appLaunch: {
                name: "appLaunch",
                displayName: "App Launch Module",
                location: "appLaunch",
                enabled: true
            },
            pushNotification: {
                name: "pushNotification",
                displayName: "Push Notification Module",
                location: "pushNotification",
                enabled: true
            },
            mailReceived: {
                name: "mailReceived",
                displayName: "Mail Received Module",
                location: "mailReceived",
                enabled: true
            },
            onboardingChangeReceived: {
                name: "onboardingChangeReceived",
                displayName: "Onboarding Change Received Module",
                location: "onboardingChangeReceived",
                enabled: true
            },
            messageReceived: {
                name: "messageReceived",
                displayName: "Message Received Module",
                location: "messageReceived",
                enabled: true
            },
            relationshipChanged: {
                name: "relationshipChanged",
                displayName: "Relationship Changed Module",
                location: "relationshipChanged",
                enabled: true
            },
            relationshipTemplateProcessed: {
                name: "relationshipTemplateProcessed",
                displayName: "Relationship Template Processed",
                location: "relationshipTemplateProcessed",
                enabled: true
            },
            decider: {
                displayName: "Decider Module",
                name: "DeciderModule",
                location: "@vermascht/runtime:DeciderModule",
                enabled: true
            },
            request: {
                displayName: "Request Module",
                name: "RequestModule",
                location: "@vermascht/runtime:RequestModule",
                enabled: true
            },
            attributeListener: {
                enabled: true,
                name: "AttributeListenerModule",
                displayName: "Attribute Listener",
                location: "@vermascht/runtime:AttributeListenerModule"
            },
            notification: {
                enabled: true,
                name: "NotificationModule",
                displayName: "Notification Module",
                location: "@vermascht/runtime:NotificationModule"
            }
        }
    }

    const mergedConfig = defaultsDeep({}, ...configs, appConfig)

    return mergedConfig
}
