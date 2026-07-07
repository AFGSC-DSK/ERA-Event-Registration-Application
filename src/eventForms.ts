import { ItemForm, LoadingDialog, Modal } from "dattatable";
import { Components, Utility, Web } from "gd-sprest-bs";
import * as moment from "moment";
import { DataSource, IEventItem } from "./ds";
import Strings from "./strings";

/**
 * 
 */
export class EventForms {
    static checkForChanges(eventItem: IEventItem, onRefresh: () => void, onProceed: () => void) {
        // Check if item has already been updated by someone else
        Web().Lists(DataSource.Configuration.eventList).getItemById(eventItem.Id).query({ //was Strings Event
            //Expand: ["Editor", "AttachmentFiles", "POC", "RegisteredUsers", "WaitListedUsers"],
            //GetAllItems: true,
            //OrderBy: ["StartDate asc"],
            //Top: 5000,
            Select: ["Title", "Description", "POCId", "Location", "Capacity", "OpenSpots", "RegisteredUsersId", "WaitListedUsersId", "Modified"] //"*", "IsCancelled", "RegistrationClosed"
        }).execute(items => {
            if ((items as IEventItem).Modified != eventItem.Modified) {
                // Check for changes/conditions that cannot be proceeded with
                if (((items as IEventItem).Capacity != eventItem.Capacity ||
                        (items as IEventItem).RegisteredUsersId != eventItem.RegisteredUsersId ||
                        (items as IEventItem).WaitListedUsersId != eventItem.WaitListedUsersId)) {
                    
                    // Refresh the dashboard to get current data and ask user to "try again"
                    onRefresh();

                    Modal.clear();

                    // Set the header
                    Modal.setHeader("Whoops!");

                    // Set the body
                    Modal.setBody("Someone else has made a change to the event's capacity and/or registrations. Please try again.");

                    // Set the type
                    Modal.setType(Components.ModalTypes.Medium);

                    // Set the footer
                    Modal.setFooter(Components.ButtonGroup({
                        buttons: [
                            {
                                text: "Close",
                                type: Components.ButtonTypes.Secondary,
                                onClick: () => {
                                    // Hide the modal
                                    Modal.hide();
                                },
                            },
                        ],
                    }).el);

                    // Show the modal
                    Modal.show();
                    return;
                }
                
                // Proceed
                onProceed();
            }
            else // No one updated the item before the current user
                onProceed();
            },
            // Error
            (error) => { 
                //Couldn't check for some reason
                if (console) console.log(error);
            }
        );
    }
    
    // Cancels an event
    static cancel(eventItem: IEventItem, onRefresh: () => void) {
        // Set the modal header
        Modal.setHeader("Cancel Event");

        // Create the form
        let form = Components.Form({
            controls: [
                {
                    type: Components.FormControlTypes.Readonly,
                    value: "Are you sure you want to cancel the event?"
                },
                {
                    name: "SendEmail",
                    label: "Send Email?",
                    type: Components.FormControlTypes.Switch,
                    value: false,
                    isReadonly: true
                }
            ]
        });

        // Set the modal body
        Modal.setBody(form.el);

        // Set the modal footer
        Modal.setFooter(Components.ButtonGroup({
            buttons: [
                {
                    text: "Confirm",
                    type: Components.ButtonTypes.Danger,
                    onClick: () => {
                        // Ensure the form is valid
                        if (form.isValid()) {
                            let sendEmail = form.getValues()["SendEmail"];

                            // Close the modal
                            Modal.hide();

                            // Show a loading dialog
                            LoadingDialog.setHeader("Cancelling Event");
                            LoadingDialog.setBody("This dialog will close after the item is updated.");
                            LoadingDialog.show();

                            //Check for changes first to make sure item capacity/users weren't changed
                            EventForms.checkForChanges(eventItem, onRefresh, () => {
                                // Update the item
                                eventItem.update({ IsCancelled: true }).execute(() => {
                                    // Refresh the dashboard
                                    onRefresh();

                                    // See if we are sending an email
                                    if (sendEmail) {
                                        // Parse the pocs
                                        let pocs = [];
                                        for (let i = 0; i < eventItem.POC.results.length; i++) {
                                            // Append the user email
                                            pocs.push(eventItem.POC.results[i].EMail);
                                        }

                                        // Parse the registered users
                                        let users = [];
                                        for (let i = 0; i < eventItem.RegisteredUsers.results.length; i++) {
                                            // Append the user email
                                            users.push(eventItem.RegisteredUsers.results[i].EMail);
                                        }

                                        // Send the email
                                        Utility().sendEmail({
                                            To: users,
                                            CC: pocs,
                                            Subject: "Event '" + eventItem.Title + "' Cancelled",
                                            Body: '<p>Event Members,</p><p>The event has been cancelled.</p><p>r/,</p><p>Event Registration Admins</p>'
                                        }).execute(() => {
                                            // Close the loading dialog
                                            LoadingDialog.hide();
                                        });
                                    } else {
                                        // Close the loading dialog
                                        LoadingDialog.hide();
                                    }
                                });
                            });
                        }
                    }
                },
                {
                    text: "Cancel",
                    type: Components.ButtonTypes.Secondary,
                    onClick: () => {
                        Modal.hide();
                    }
                }
            ]
        }).el);

        // Display the modal
        Modal.show();
    }

    // Creates an event
    static create(onRefresh: () => void) {
        // Create an item
        ItemForm.create({
            onUpdate: () => { onRefresh(); },
            onCreateEditForm: props => { return this.updateProps(props); },
            onFormButtonsRendering: buttons => { return this.updateFooter(buttons); }
        });

        // Update the modal properties
        Modal.setScrollable(true);
    }

    // Edits the event
    static edit(eventItem: IEventItem, onRefresh: () => void) {
        // Display the edit form
        ItemForm.edit({
            itemId: eventItem.Id,
            onUpdate: () => { onRefresh(); },
            onCreateEditForm: props => { return this.updateProps(props); },
            onFormButtonsRendering: buttons => { return this.updateFooter(buttons); }
        });

        // Update the modal
        Modal.setScrollable(true);
    }

    // Deletes an event
    static delete(eventItem: IEventItem, onRefresh: () => void) {
        // Clear the modal
        Modal.clear();

        // Set the header
        Modal.setHeader("Delete Event");

        // Set the body
        Modal.setBody("Are you sure you wanted to delete the selected event?");

        // Set the type
        Modal.setType(Components.ModalTypes.Medium);

        // Set the footer
        Modal.setFooter(Components.ButtonGroup({
            buttons: [
                {
                    text: "Yes",
                    type: Components.ButtonTypes.Primary,
                    onClick: () => {
                        // Show the loading dialog
                        LoadingDialog.setHeader("Delete Event");
                        LoadingDialog.setBody("Deleting the event");
                        LoadingDialog.show();

                        //Check for changes first to make sure item capacity/users weren't changed
                        EventForms.checkForChanges(eventItem, onRefresh, () => {
                            // Delete the item
                            eventItem.delete().execute(
                                () => {
                                    // Refresh the dashboard
                                    onRefresh();

                                    // Hide the dialog/modal
                                    Modal.hide();
                                    LoadingDialog.hide();
                                },
                                () => {
                                    LoadingDialog.hide();
                                }
                            );
                        });
                    },
                },
                {
                    text: "No",
                    type: Components.ButtonTypes.Secondary,
                    onClick: () => {
                        // Hide the modal
                        Modal.hide();
                    },
                },
            ],
        }).el);

        // Show the modal
        Modal.show();
    }

    // Uncancels an event
    static uncancel(eventItem: IEventItem, onRefresh: () => void) {
        // Set the modal header
        Modal.setHeader("Uncancel Event");

        // Create the form
        let form = Components.Form({
            controls: [
                {
                    type: Components.FormControlTypes.Readonly,
                    value: "Are you sure you want to uncancel the event?"
                },
                {
                    name: "SendEmail",
                    label: "Send Email?",
                    type: Components.FormControlTypes.Switch,
                    value: false,
                    isReadonly: true
                }
            ]
        });

        // Set the modal body
        Modal.setBody(form.el);

        // Set the modal footer
        Modal.setFooter(Components.ButtonGroup({
            buttons: [
                {
                    text: "Confirm",
                    type: Components.ButtonTypes.Primary,
                    onClick: () => {
                        // Ensure the form is valid
                        if (form.isValid()) {
                            let sendEmail = form.getValues()["SendEmail"];

                            // Close the modal
                            Modal.hide();

                            // Show a loading dialog
                            LoadingDialog.setHeader("Cancelling Event");
                            LoadingDialog.setBody("This dialog will close after the item is updated.");
                            LoadingDialog.show();

                            //Check for changes first to make sure item capacity/users weren't changed
                            EventForms.checkForChanges(eventItem, onRefresh, () => {
                                // Update the item
                                eventItem.update({ IsCancelled: false }).execute(() => {
                                    // Refresh the dashboard
                                    onRefresh();

                                    // See if we are sending an email
                                    if (sendEmail) {
                                        // Parse the pocs
                                        let pocs = [];
                                        for (let i = 0; i < eventItem.POC.results.length; i++) {
                                            // Append the user email
                                            pocs.push(eventItem.POC.results[i].EMail);
                                        }

                                        // Parse the registered users
                                        let users = [];
                                        for (let i = 0; i < eventItem.RegisteredUsers.results.length; i++) {
                                            // Append the user email
                                            users.push(eventItem.RegisteredUsers.results[i].EMail);
                                        }

                                        // Send the email
                                        Utility().sendEmail({
                                            To: users,
                                            CC: pocs,
                                            Subject: "Event '" + eventItem.Title + "' Uncancelled",
                                            Body: '<p>Event Members,</p><p>The event is no longer cancelled.</p><p>r/,</p><p>Event Registration Admins</p>'
                                        }).execute(() => {
                                            // Close the loading dialog
                                            LoadingDialog.hide();
                                        });
                                    } else {
                                        // Close the loading dialog
                                        LoadingDialog.hide();
                                    }
                                });
                            });
                        }
                    }
                },
                {
                    text: "Cancel",
                    type: Components.ButtonTypes.Secondary,
                    onClick: () => {
                        Modal.hide();
                    }
                }
            ]
        }).el);

        // Display the modal
        Modal.show();
    }

    // Updates the footer for the new/edit form
    private static updateFooter(buttons: Components.IButtonProps[]) {
        // Update the default button
        buttons[0].type = Components.ButtonTypes.Primary;

        // Add the cancel button
        buttons.push({
            text: "Cancel",
            type: Components.ButtonTypes.Secondary,
            onClick: () => {
                ItemForm.close();
            }
        });

        // Return the buttons
        return buttons;
    }

    // Updates the new/edit form properties
    private static updateProps(props: Components.IListFormEditProps) {
        // Set the rendering event
        props.onControlRendering = (ctrl, field) => {
            // See if this is the start date
            if (field.InternalName == "StartDate") {
                // Add validation
                ctrl.onValidate = (ctrl, results) => {
                    // See if the start date is after the end date
                    let startDate = results.value;
                    let endDate = ItemForm.EditForm.getControl("EndDate").getValue();
                    if (moment(startDate).isAfter(moment(endDate))) {
                        // Update the validation
                        results.isValid = false;
                        results.invalidMessage = "Start Date cannot be after the End Date";
                    }

                    // Return the results
                    return results;
                }
            }
            // Else, see if this is the capacity field
            else if (field.InternalName == "Capacity") {
                // Add validation
                ctrl.onValidate = (ctrl, results) => {
                    // Ensure an item exists
                    let item = ItemForm.FormInfo.item as IEventItem;
                    if (item) {
                        let registeredUsers = item.RegisteredUsers ? item.RegisteredUsers.results.length : 0;

                        // See if the value is less than the # of registered users
                        if (results.value < registeredUsers) {
                            // Set the results
                            results.isValid = false;
                            results.invalidMessage = "The value is less than the current number of registered users.";
                        }
                    }

                    // Return the results
                    return results;
                }
            }
        }

        // Return the properties
        return props;
    }

    //TODO: Future concept only
    static openRegisterForm(eventItem:IEventItem, onComplete: () => void) {
        // Set the modal header
        Modal.setHeader("Required Information")

        // Create the form
        let form = Components.Form({
        controls: [
            {
                name: "Rank",
                label: "Rank",
                required: true,
                type: Components.FormControlTypes.TextField
            },
            {
                // name: "User",
                // label: "User",
                // required: true,
                // errorMessage: "A user is required.",
                // type: Components.FormControlTypes.PeoplePicker,
                // onValidate: (ctrl, result) => {
                //     // Parse the current POCs
                //     let users = eventItem.RegisteredUsersId ? eventItem.RegisteredUsersId.results : [];
                //     for (let i = 0; i < users.length; i++) {
                //     // See if the user is already registered
                //     if (users[i] == result.value[0].Id) {
                //         // User is already registered
                //         result.isValid = false;
                //         result.invalidMessage = "User is already registered.";
                //     }
                //     }

                //     // Return the result
                //     return result;
                // }
            },
            {
                name: "Directorate",
                label: "Directorate",
                type: Components.FormControlTypes.Dropdown,
                // onControlRendering: function (props) {
                //     // Set the dropdown items
                //     props.items = [
                //         { text: "" },
                //         { text: "Item 1" },
                //         { text: "Item 2" },
                //         { text: "Item 3" },
                //         { text: "Item 4" },
                //         { text: "Item 5" }
                //     ];
                // }
                items: [
                    {
                        text: "A1",
                        value: "A1"
                    },
                    {
                        text: "A2",
                        value: "A2"
                    }
                ]
            } as Components.IFormControlPropsDropdown,
            {
                name: "ArrivalDate",
                label: "Date of Arrival",
                required: true,
                type: Components.FormControlTypes.DateTime,
            } as Components.IFormControlPropsDateTime,
            {
                name: "DoDID",
                label: "DoD ID Number",
                required: true,
                type: Components.FormControlTypes.TextField
            },
            {
                name: "SIPREmail",
                label: "SIPR email address",
                required: true,
                type: Components.FormControlTypes.TextField
            },
            {
                name: "YellowBadge",
                label: "Do you have a yellow badge?",
                required: true,
                type: Components.FormControlTypes.Dropdown,
                items: [
                    {
                        text: "Yes",
                        value: "Yes"
                    },
                    {
                        text: "No",
                        value: "No"
                    },
                    {
                        text: "Unsure",
                        value: "I don't know"
                    }                    
                ]
            } as Components.IFormControlPropsDropdown,
            {
                name: "Attachment",
                label: "Attachments",
                type: Components.FormControlTypes.File,
                required: false
            }
        ]   
        });

        // Set the modal body
        Modal.setBody(form.el);

        Modal.setScrollable(true);

        // Set the modal footer
        Modal.setFooter(Components.ButtonGroup({
        buttons: [
            {
                text: "Finish",
                type: Components.ButtonTypes.Primary,
                onClick: () => {
                    // Ensure the form is valid
                    if (form.isValid()) {
                        let formValues = form.getValues();

                        // Attachment: "C:\\fakepath\\Template_Memo_AIRCOM.docx"
                        // YellowBadge:
                        //     text: "Unsure"
                        //     value: "I don't know"

                        // Close the modal
                        Modal.hide();

                        // // Show a loading dialog
                        // LoadingDialog.setHeader("Registering User");
                        // LoadingDialog.setBody("This dialog will close after the user is registered.");
                        // LoadingDialog.show();

                        // Update the item
                        //formValues["SendEmail"]
                        
                        //Web().Lists(Strings.Lists.RegisteredStudents) . items? .query
                        //SP.Data.ACC_x0020_Registered_x0020_StudentsListItem
                        // var itemType = GetItemTypeForListName(listName);
                        // function GetItemTypeForListName(name) {
                        //     return "SP.Data." + name.charAt(0).toUpperCase() + name.split(" ").join("").slice(1) + "ListItem";
                        // }

                        //Do work
                        // Web().Lists(Strings.Lists.RegisteredStudents).Items().add({
                        //     //"__metadata": { "type": itemType },
                        //     //"Title": newItemTitle
                        //     "Rank": formValues["Rank"],
                        //     "Directorate": formValues["Directorate"],
                        //     "DoDID_x0020_Number": formValues["DoDID"],
                        //     "Date_x0020_of_x0020_Arrival": formValues["ArrivalDate"],
                        //     "SIPREmail": formValues["SIPREmail"],
                        //     "Do_x0020_you_x0020_have_x0020_a_": formValues["YellowBadge"]
                        // }).execute(value => {
                        //     onComplete();
                        // },
                        // // Error
                        // (error) => { 
                        //     //Couldn't add for some reason
                        //     //status: 404
                        //     //response: "{\"error\":{\"code\":\"-1, System.ArgumentException\",\"message\":{\"lang\":\"en-US\",\"value\":\"List 'ACC Registered Students' does not exist at site with URL 'https://usaf.dps.mil/sites/ua-cs/csdt/Allshouse'.\"}}}"
                        //     if (console) console.log(error);
                        // });
                    }
                }
            },
            {
                text: "Cancel",
                type: Components.ButtonTypes.Secondary,
                onClick: () => {
                    Modal.hide();
                }
            }
        ]
        }).el);

        // Display the modal
        Modal.show();
    }
}