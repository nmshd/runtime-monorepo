const path = require("path")
const CopyWebpackPlugin = require("copy-webpack-plugin")

module.exports = {
    mode: "development",
    node: {
        global: false
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                { from: "../../node_modules/@vermascht/transport/lib-web" },
                { from: "../../node_modules/@nmshd/crypto/lib-web" },
                { from: "../../node_modules/@js-soft/ts-serval/lib-web" }
            ]
        })
    ],
    entry: {
        "nmshd.content": "./dist/index"
    },
    output: {
        path: path.resolve(__dirname, "lib-web"),
        filename: "[name].js",
        library: "NMSHDContent",
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
        "fs-extra": "NMSHDTransport",
        fs: "NMSHDTransport",
        "graceful-fs": "NMSHDTransport",
        "@vermascht/transport": "NMSHDTransport",
        "@nmshd/crypto": "NMSHDCrypto",
        "@js-soft/ts-serval": "TSServal"
    }
}
