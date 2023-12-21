import { buildInformation as servalBuildInformation } from "@js-soft/ts-serval"
import { buildInformation as cryptoBuildInformation } from "@nmshd/crypto"
import { buildInformation as consumptionBuildInformation } from "@vermascht/consumption"
import { buildInformation as contentBuildInformation } from "@vermascht/content"
import { buildInformation as runtimeBuildInformation } from "@vermascht/runtime"
import { buildInformation as transportBuildInformation } from "@vermascht/transport"

export const buildInformation = {
    version: "{{version}}",
    build: "{{build}}",
    date: "{{date}}",
    commit: "{{commit}}",
    dependencies: "{{dependencies}}",
    libraries: {
        serval: servalBuildInformation,
        crypto: cryptoBuildInformation,
        transport: transportBuildInformation,
        consumption: consumptionBuildInformation,
        content: contentBuildInformation,
        runtime: runtimeBuildInformation
    }
}
