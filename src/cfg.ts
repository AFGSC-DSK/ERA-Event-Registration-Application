import { Helper, SPTypes } from "gd-sprest-bs";
import Strings from "./strings";
import { DataSource } from "./ds";
/**
 * SharePoint Assets
 */
export const Configuration = Helper.SPConfig({
    ListCfg: [
        {
            ListInformation: {
                Title: Strings.Lists.Events, //DataSource.Configuration.eventList,
                BaseTemplate: SPTypes.ListTemplateType.GenericList
            },
            CustomFields: [
                {
                    name: "Description",
                    title: "Description",
                    type: Helper.SPCfgFieldType.Note,
                    noteType: SPTypes.FieldNoteType.EnhancedRichText
                } as Helper.IFieldInfoNote,
                {
                    name: "StartDate",
                    title: "Start Date",
                    type: Helper.SPCfgFieldType.Date,
                    format: SPTypes.DateFormat.DateTime,
                    displayFormat: SPTypes.DateFormat.DateTime,
                    defaultValue: "",
                    required: true,
                    showInNewForm: true
                } as Helper.IFieldInfoDate,
                {
                    name: "EndDate",
                    title: "End Date",
                    type: Helper.SPCfgFieldType.Date,
                    format: 1,
                    displayFormat: SPTypes.DateFormat.DateTime,
                    defaultValue: "",
                    required: true,
                    showInNewForm: true,
                } as Helper.IFieldInfoDate,
                {
                    name: "POC",
                    title: "POC",
                    type: Helper.SPCfgFieldType.User,
                    multi: true,
                    required: true,
                    selectionMode: SPTypes.FieldUserSelectionType.PeopleOnly
                } as Helper.IFieldInfoUser,
                {
                    name: "Location",
                    title: "Location",
                    type: Helper.SPCfgFieldType.Text,
                    defaultValue: "",
                    required: true
                },
                {
                    name: "OpenSpots",
                    title: "Open Spots",
                    type: Helper.SPCfgFieldType.Number,
                    defaultValue: "0",
                    required: true,
                    showInNewForm: false,
                    showInEditForm: false,
                    readOnly: true
                },
                {
                    name: "Capacity",
                    title: "Capacity",
                    type: Helper.SPCfgFieldType.Number,
                    defaultValue: "0",
                    required: true,
                    showInNewForm: true
                },
                {
                    //Resolve issue with field created as User instead of UserMulti
                    schemaXml: "<Field Type='UserMulti' Name='WaitListedUsers' StaticName='WaitListedUsers' DisplayName='Wait Listed Users' Mult='TRUE' UserSelectionMode='PeopleOnly' ShowField='ImnName' ShowInNewForm='FALSE' ShowInEditForm='FALSE' ShowInViewForms='FALSE' />",
                    //name: "WaitListedUsers",
                    //title: "Wait Listed Users",
                    //type: Helper.SPCfgFieldType.User,
                    //multi: true,
                    //selectionMode: SPTypes.FieldUserSelectionType.PeopleOnly,
                    //showInViewForms: false,
                    //showInEditForm: false,
                    //showInNewForm: false,
                } as Helper.IFieldInfoUser,
                {
                    //Resolve issue with field created as User instead of UserMulti
                    schemaXml: "<Field Type='UserMulti' Name='RegisteredUsers' StaticName='RegisteredUsers' DisplayName='Registered Users' Mult='TRUE' UserSelectionMode='PeopleOnly' ShowField='ImnName' ShowInNewForm='FALSE' ShowInEditForm='FALSE' ShowInViewForms='FALSE' />",
                    // name: "RegisteredUsers",
                    // title: "Registered Users",
                    // type: Helper.SPCfgFieldType.User,
                    // multi: true,
                    // selectionMode: SPTypes.FieldUserSelectionType.PeopleOnly,
                    // showInViewForms: false,
                    // showInEditForm: false,
                    // showInNewForm: false,
                } as Helper.IFieldInfoUser,
                {
                    name: "IsCancelled",
                    title: "Is Cancelled?",
                    type: Helper.SPCfgFieldType.Boolean,
                    showInEditForm: false,
                    showInNewForm: false,
                },
                {
                    name: "RegistrationClosed",
                    title: "Registration Closed",
                    type: Helper.SPCfgFieldType.Boolean,
                    showInEditForm: true,
                    showInNewForm: false,
                }
            ],
            ViewInformation: [
                {
                    ViewName: "All Items",
                    ViewFields: [
                        "LinkTitle", "StartDate", "EndDate",  "POC", "Location", "Capacity", "OpenSpots", "RegisteredUsers", "WaitListedUsers"
                    ]
                }
            ]
        },
    ]
});

// Adds the solution to a classic page
Configuration["addToPage"] = (pageUrl: string) => {
    // Add a content editor webpart to the page
    Helper.addContentEditorWebPart(pageUrl, {
        contentLink: Strings.SolutionUrl,
        description: Strings.ProjectDescription,
        frameType: "None",
        title: Strings.ProjectName
    }).then(
        // Success
        () => {
            // Load
            console.log("[" + Strings.ProjectName + "] Successfully added the solution to the page.", pageUrl);
        },

        // Error
        ex => {
            // Load
            console.log("[" + Strings.ProjectName + "] Error adding the solution to the page.", ex);
        }
    );
}