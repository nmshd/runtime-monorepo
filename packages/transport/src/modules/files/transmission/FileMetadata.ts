import { serialize, type, validate } from "@js-soft/ts-serval"
import { CryptoSecretKey, ICryptoSecretKey } from "@nmshd/crypto"
import { CoreDate, CoreHash, CoreSerializable, ICoreDate, ICoreHash, ICoreSerializable } from "../../../core"

export interface IFileMetadata extends ICoreSerializable {
    title?: string
    description?: string
    filename: string

    plaintextHash: ICoreHash
    secretKey: ICryptoSecretKey

    filesize: number
    filemodified?: ICoreDate
    mimetype: string
}

@type("FileMetadata")
export class FileMetadata extends CoreSerializable implements IFileMetadata {
    @validate({ nullable: true })
    @serialize()
    public title?: string

    @validate({ nullable: true })
    @serialize()
    public description?: string

    @validate()
    @serialize()
    public filename: string

    @validate()
    @serialize()
    public plaintextHash: CoreHash

    @validate()
    @serialize()
    public secretKey: CryptoSecretKey

    @validate()
    @serialize()
    public filesize: number

    @validate({ nullable: true })
    @serialize()
    public filemodified?: CoreDate

    @validate()
    @serialize()
    public mimetype: string

    public static from(value: IFileMetadata): FileMetadata {
        return this.fromAny(value)
    }
}
