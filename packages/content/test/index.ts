import { SimpleLoggerFactory } from "@js-soft/simple-logger"
import { AddressValueTests } from "./attributeValues/AddressValueTests.test"
import { BirthValueTests } from "./attributeValues/BirthValueTests.test"
import { NameValueTests } from "./attributeValues/NameValueTests.test"
import { ProprietaryJSONTests } from "./attributeValues/ProprietaryJSON.test"
import { ProprietaryXMLTests } from "./attributeValues/ProprietaryXML.test"
import { StatementValueTest } from "./attributeValues/StatementValueTest.test"
import { HintsInheritanceTest } from "./attributes/HintsInheritance.test"
import { IQLQueryTest } from "./attributes/IQLQuery.test"
import { IdentityAttributeTest } from "./attributes/IdentityAttribute.test"
import { IdentityAttributeQueryTest } from "./attributes/IdentityAttributeQuery.test"
import { RelationshipAttributeTest } from "./attributes/RelationshipAttribute.test"
import { RelationshipAttributeHintsTest } from "./attributes/RelationshipAttributeHints.test"
import { RenderHintsTest } from "./attributes/RenderHints.test"
import { ThirdPartyRelationshipAttributeQueryTest } from "./attributes/ThirdPartyRelationshipAttributeQuery.test"
import { ValueHintsTest } from "./attributes/ValueHints.test"
import { MailTest } from "./messages/Mail.test"
import { NotificationTest } from "./notifications/Notification.test"
import { RequestTest } from "./requests/Request.test"
import { ResponseTest } from "./requests/Response.test"
import { ResponseWrapperTest } from "./requests/ResponseWrapper.test"

const loggerFactory = new SimpleLoggerFactory()

new ValueHintsTest(loggerFactory).run()
new RenderHintsTest(loggerFactory).run()
new HintsInheritanceTest(loggerFactory).run()
new MailTest(loggerFactory).run()
new RequestTest(loggerFactory).run()
new ResponseTest(loggerFactory).run()
new RelationshipAttributeTest(loggerFactory).run()
new IdentityAttributeTest(loggerFactory).run()
new IdentityAttributeQueryTest(loggerFactory).run()
new NameValueTests(loggerFactory).run()
new BirthValueTests(loggerFactory).run()
new AddressValueTests(loggerFactory).run()
new RelationshipAttributeHintsTest(loggerFactory).run()
new ProprietaryJSONTests(loggerFactory).run()
new ProprietaryXMLTests(loggerFactory).run()
new ThirdPartyRelationshipAttributeQueryTest(loggerFactory).run()
new IQLQueryTest(loggerFactory).run()
new ResponseWrapperTest(loggerFactory).run()
new StatementValueTest(loggerFactory).run()
new NotificationTest(loggerFactory).run()
