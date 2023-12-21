const path = require("path")
const webpack = require("webpack")
const CopyWebpackPlugin = require("copy-webpack-plugin")

module.exports = {
    // Change to your "entry-point".
    mode: "development",
    node: {
        global: false
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [{"from":"../../node_modules/@vermascht/runtime/lib-web"},{"from":"../../node_modules/@vermascht/consumption/lib-web"},{"from":"../../node_modules/@vermascht/content/lib-web"},{"from":"../../node_modules/@vermascht/transport/lib-web"},{"from":"../../node_modules/@nmshd/crypto/lib-web"},{"from":"../../node_modules/@js-soft/ts-serval/lib-web"},{"from":"../../node_modules/lokijs/build/lokijs.min.js"},{"from":"../../node_modules/js-logger/src/logger.js"}]
        })
    ],
    entry: {
        "nmshd.app-runtime": "./dist/index"
    },
    output: {
        path: path.resolve(__dirname, "lib-web"),
        filename: "[name].js",
        library: "NMSHDAppRuntime",
        umdNamedDefine: true
    },
    resolve: {
        extensions: [".js", ".json"],
        alias: {
            src: path.resolve(__dirname, "tmp-browser/src/")
        }
    },
    devtool: "source-map",
    externals: [
        {
            chai: "chai",
            lokijs: "loki",
            agentkeepalive: "NMSHDTransport",
            process: "NMSHDTransport",
            path: "NMSHDTransport",
            "fs-extra": "NMSHDTransport",
            fs: "NMSHDTransport",
            jQuery: "jQuery",
            "graceful-fs": "NMSHDTransport",
            "@vermascht/consumption": "NMSHDConsumption",
            "@vermascht/content": "NMSHDContent",
            "@vermascht/transport": "NMSHDTransport",
            "@nmshd/crypto": "NMSHDCrypto",
            "@vermascht/runtime": "NMSHDRuntime",
            "@js-soft/ts-serval": "TSServal"
        }
    ]
}
