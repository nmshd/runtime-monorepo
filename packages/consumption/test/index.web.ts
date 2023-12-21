import { LokiJsConnection } from "@js-soft/docdb-access-loki"
import { WebLoggerFactory } from "@js-soft/web-logger"
import { Test } from "./Test"

const config = { ...Test.config, baseUrl: "/svc" }
const loggerFactory = new WebLoggerFactory()
Test.runIntegrationTests(config, new LokiJsConnection("./db"), loggerFactory)
Test.runUnitTests(loggerFactory)
