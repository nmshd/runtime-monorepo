import { buildInformation as servalBuildInformation } from "@js-soft/ts-serval"
import { buildInformation as cryptoBuildInformation } from "@nmshd/crypto"
import { buildInformation as contentBuildInformation } from "@vermascht/content"
import { buildInformation as transportBuildInformation } from "@vermascht/transport"

export const buildInformation = {
    version: "{{version}}",
    build: "{{build}}",
    date: "{{date}}",
    commit: "{{commit}}",
    dependencies: "{{dependencies}}",
    libraries: {
        transport: transportBuildInformation,
        crypto: cryptoBuildInformation,
        serval: servalBuildInformation,
        content: contentBuildInformation
    }
}
