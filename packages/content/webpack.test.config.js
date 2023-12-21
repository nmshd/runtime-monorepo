const path = require("path")

module.exports = {
    mode: "development",
    node: {
        global: false
    },
    entry: "./dist-test/index",
    output: {
        path: path.resolve(__dirname, "lib-web"),
        filename: "nmshd.content.test.js",
        library: "NMSHDContentTest",
        umdNamedDefine: true
    },
    resolve: {
        extensions: [".js", ".json"],
        alias: {
            src: path.resolve(__dirname, "tmp-browser/src/")
        }
    },
    devtool: "source-map",
    externals: {
        chai: "chai",
        agentkeepalive: "NMSHDTransport",
        process: "NMSHDTransport",
        path: "NMSHDTransport",
        assert: "NMSHDTransport",
        util: "NMSHDTransport",
        "fs-extra": "NMSHDTransport",
        fs: "NMSHDTransport",
        "graceful-fs": "NMSHDTransport",
        "@vermascht/transport": "NMSHDTransport",
        "@vermascht/content": "NMSHDContent",
        "@nmshd/crypto": "NMSHDCrypto",
        "@js-soft/ts-serval": "TSServal"
    }
}
