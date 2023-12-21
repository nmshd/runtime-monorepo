const path = require("path")
const webpack = require("webpack")
const TerserPlugin = require("terser-webpack-plugin")

module.exports = {
    // Change to your "entry-point".
    mode: "production",
    node: {
        global: false
    },
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    keep_classnames: true,
                    keep_fnames: true
                }
            })
        ]
    },
    entry: {
        "nmshd.app-runtime.min": "./dist/index"
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
    externals: {
        chai: "chai",
        lokijs: "loki",
        agentkeepalive: "NMSHDTransport",
        process: "NMSHDTransport",
        path: "NMSHDTransport",
        "fs-extra": "NMSHDTransport",
        fs: "NMSHDTransport",
        sap: "sap",
        "graceful-fs": "NMSHDTransport",
        "@vermascht/consumption": "NMSHDConsumption",
        "@vermascht/content": "NMSHDContent",
        "@vermascht/transport": "NMSHDTransport",
        "@nmshd/crypto": "NMSHDCrypto",
        "@vermascht/runtime": "NMSHDRuntime",
        "@js-soft/ts-serval": "TSServal"
    }
}
