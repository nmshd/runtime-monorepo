import { LocalRequest, LocalRequestStatus, LocalRequestStatusLogEntry, LocalResponse } from "@vermascht/consumption"
import { ResponseItem } from "@vermascht/content"
import { CoreDate } from "@vermascht/transport"
import { expect } from "chai"
import { UnitTest } from "../../../core/UnitTest"
import { TestObjectFactory } from "../testHelpers/TestObjectFactory"
import { TestRequestItem } from "../testHelpers/TestRequestItem"

export class LocalRequestTest extends UnitTest {
    public run(): void {
        describe("LocalRequest", function () {
            it("creates objects of all nested classes", function () {
                const request = TestObjectFactory.createLocalRequestWith({
                    contentProperties: {},
                    status: LocalRequestStatus.Open,
                    statusLogEntries: [
                        LocalRequestStatusLogEntry.from({
                            createdAt: CoreDate.from("2020-01-01T00:00:00.000Z"),
                            oldStatus: LocalRequestStatus.Open,
                            newStatus: LocalRequestStatus.Completed
                        })
                    ]
                })

                expect(request).to.be.instanceOf(LocalRequest)
                expect(request.content.items[0]).to.be.instanceOf(TestRequestItem)
                expect(request.response).to.be.instanceOf(LocalResponse)
                expect(request.response!.content.items[0]).to.be.instanceOf(ResponseItem)
                expect(request.statusLog[0]).to.be.instanceOf(LocalRequestStatusLogEntry)
            })

            describe("changeStatus", function () {
                it("changes the status", function () {
                    const request = TestObjectFactory.createLocalRequestWith({})

                    request.changeStatus(LocalRequestStatus.Completed)

                    expect(request.status).to.equal(LocalRequestStatus.Completed)
                })

                it("adds a status log entry on status change", function () {
                    const request = TestObjectFactory.createLocalRequestWith({})
                    request.changeStatus(LocalRequestStatus.Open)

                    expect(request.statusLog.length).to.equal(1)
                    expect(request.statusLog[0].oldStatus).to.equal(LocalRequestStatus.Draft)
                    expect(request.statusLog[0].newStatus).to.equal(LocalRequestStatus.Open)
                })

                it("throws an error when changing the status to the same status", function () {
                    const request = TestObjectFactory.createLocalRequestWith({ status: LocalRequestStatus.Open })
                    expect(() => request.changeStatus(LocalRequestStatus.Open)).to.throw(
                        "cannot change status to the same status"
                    )
                })
            })

            describe("updateStatusBasedOnExpiration", function () {
                it("sets the status to expired when the request is expired", function () {
                    const request = TestObjectFactory.createLocalRequestWith({
                        contentProperties: {
                            expiresAt: CoreDate.utc().subtract({ days: 1 })
                        }
                    })

                    request.updateStatusBasedOnExpiration()
                    expect(request.status).to.equal(LocalRequestStatus.Expired)
                })

                it("does not change the status when the request is expired but already completed", function () {
                    const request = TestObjectFactory.createLocalRequestWith({ status: LocalRequestStatus.Completed })

                    request.updateStatusBasedOnExpiration()
                    expect(request.status).to.equal(LocalRequestStatus.Completed)
                })

                it("does not change the status when the request is expired but already expired", function () {
                    const request = TestObjectFactory.createLocalRequestWith({ status: LocalRequestStatus.Expired })

                    request.updateStatusBasedOnExpiration()
                    expect(request.status).to.equal(LocalRequestStatus.Expired)
                })
            })
        })
    }
}
