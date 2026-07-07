import { LoadingDialog, Modal } from "dattatable";
import { Components, ContextInfo, Utility, Web } from "gd-sprest-bs";
import { DataSource, IEventItem } from "./ds";
import Strings from "./strings";
import * as moment from "moment";
import { calendarPlusFill } from "gd-sprest-bs/build/icons/svgs/calendarPlusFill"
import { calendarMinusFill } from "gd-sprest-bs/build/icons/svgs/calendarMinusFill"
import { personPlusFill } from "gd-sprest-bs/build/icons/svgs/personPlusFill";
import { personXFill } from "gd-sprest-bs/build/icons/svgs/personXFill";

/**
 * Registration Button
 */
export class Registration {
    private _el: HTMLElement = null;
    private _item: IEventItem = null;
    private _onRefresh: () => void = null;

    // Constructor
    constructor(el: HTMLElement, item: IEventItem, onRefresh: () => void) {
        // Set the properties
        this._el = el;
        this._item = item;
        this._onRefresh = onRefresh;

        // Render the component
        this.render();
    }

    static findUserRegistrationAndDelete = (eventItem:IEventItem, userId:number) => {
        if (DataSource.Configuration.userRegistrationList)
            Web().Lists(DataSource.Configuration.userRegistrationList).Items().query({
                //Expand: ["Editor", "AttachmentFiles", "POC", "RegisteredUsers", "WaitListedUsers"],
                //GetAllItems: true,
                //OrderBy: ["StartDate asc"],
                //Top: 5000,
                // Select: [
                //     "*", "POC/Id", "POC/Title", "POC/EMail",
                //     "RegisteredUsers/Id", "RegisteredUsers/Title", "RegisteredUsers/EMail",
                //     "WaitListedUsers/Id", "WaitListedUsers/Title", "WaitListedUsers/EMail",
                //     "Editor/Id", "Editor/Title",
                // ]
                Filter: DataSource.Configuration.userRegistrationEventField + "Id eq " + eventItem.Id.toString() + " and PersonId eq " + userId,
            }).execute(items => {
                    const item = items.results && items.results[0];
                    if (item) {
                        Web().Lists(DataSource.Configuration.userRegistrationList).Items().getById(item.Id).delete()
                        .execute(value => {
                            //Nothing needed
                        },
                        // Error
                        (error) => { 
                            //Couldn't add for some reason
                            //status: 404
                            //response: "{\"error\":{\"code\":\"-1, System.ArgumentException\",\"message\":{\"lang\":\"en-US\",\"value\":\"List 'ACC Registered Students' does not exist at site with URL 'https://usaf.dps.mil/sites/ua-cs/csdt/Allshouse'.\"}}}"
                            if (console) console.log(error);
                        });
                    }
                },
                // Error
                () => { }
            );
    }

    static setUserFromWaitlistToRegistered = (eventItem:IEventItem, userId:number) => {
        if (DataSource.Configuration.userRegistrationList)
            Web().Lists(DataSource.Configuration.userRegistrationList).Items().query({
                //Expand: ["Editor", "AttachmentFiles", "POC", "RegisteredUsers", "WaitListedUsers"],
                //GetAllItems: true,
                //OrderBy: ["StartDate asc"],
                //Top: 5000,
                // Select: [
                //     "*", "POC/Id", "POC/Title", "POC/EMail",
                //     "RegisteredUsers/Id", "RegisteredUsers/Title", "RegisteredUsers/EMail",
                //     "WaitListedUsers/Id", "WaitListedUsers/Title", "WaitListedUsers/EMail",
                //     "Editor/Id", "Editor/Title",
                // ]
                Filter: DataSource.Configuration.userRegistrationEventField + "Id eq " + eventItem.Id.toString() + " and PersonId eq " + userId,
            }).execute(items => {
                    const item = items.results && items.results[0];
                    if (item) {
                        Web().Lists(DataSource.Configuration.userRegistrationList).Items().getById(item.Id).update({
                            "Status": "Registered"
                        })
                        .execute(value => {
                            //Nothing needed
                        },
                        // Error
                        (error) => { 
                            //Couldn't add for some reason
                            //status: 404
                            //response: "{\"error\":{\"code\":\"-1, System.ArgumentException\",\"message\":{\"lang\":\"en-US\",\"value\":\"List 'ACC Registered Students' does not exist at site with URL 'https://usaf.dps.mil/sites/ua-cs/csdt/Allshouse'.\"}}}"
                            if (console) console.log(error);
                        });
                    }
                    else //Couldn't find user record, so add one
                        Registration.addUserRegistration(eventItem, userId, "Registered");
                },
                // Error
                () => { }
            );
    }

    static addUserRegistration = (eventItem:IEventItem, userId:number, status:string) => {
        if (DataSource.Configuration.userRegistrationList) {
            let addConfig = {
                //"__metadata": { "type": itemType },
                "Title": eventItem.Title,
                "PersonId": userId,
                "Status": status
            };
            addConfig[DataSource.Configuration.userRegistrationEventField + "Id"] = eventItem.Id;
            addConfig["EventType"] = DataSource.Configuration.userRegistrationEventType;
            //Send it
            Web().Lists(DataSource.Configuration.userRegistrationList).Items().add(addConfig).execute(value => {
                //Nothing
                console.log(value);
            },
            // Error
            (error) => { 
                //Couldn't add for some reason
                //status: 404
                //response: "{\"error\":{\"code\":\"-1, System.ArgumentException\",\"message\":{\"lang\":\"en-US\",\"value\":\"List 'ACC Registered Students' does not exist at site with URL 'https://usaf.dps.mil/sites/ua-cs/csdt/Allshouse'.\"}}}"
                if (console) console.log(error);
            });
        }
    }

    // Gets the user email
    static getUserEmail(userId: number): PromiseLike<string> {
        // Return a promise
        return new Promise((resolve) => {
            if (userId > 0) {
                // Get the user's email
                Web().getUserById(userId).execute(user => {
                    // Resolve the promise
                    resolve(user.Email);
                });
            } else {
                // Resolve the promise with the current user's email
                resolve(ContextInfo.userEmail);
            }
        });
    }

    // Determines if an event is empty
    static isEmpty(event: IEventItem) {
        // Determine if the course is empty
        return event.RegisteredUsersId == null;
    }

    // Determines if an event is full
    static isFull(event: IEventItem) {
        // Determine if the course is full
        let numUsers: number = event.RegisteredUsersId ? event.RegisteredUsersId.results.length : 0;
        let capacity: number = event.Capacity ? event.Capacity : 0;
        return numUsers >= capacity ? true : false;
    }

    // Renders the registration button
    private render() {

        // See if the user if registered
        let isRegistered = this._item.RegisteredUsersId ? this._item.RegisteredUsersId.results.indexOf(ContextInfo.userId) >= 0 : false;

        // See if the course is full
        let eventFull = Registration.isFull(this._item);

        // Check if user is on the waitlist
        let userID = ContextInfo.userId;
        let userOnWaitList = this._item.WaitListedUsersId ? this._item.WaitListedUsersId.results.indexOf(ContextInfo.userId) >= 0 : false;

        // Render the buttons based on user/event status
        let btnText: string = "";
        let btnType: number = null;
        let dlg: string = "";
        let iconType: any = null;
        let iconSize: number = 24;
        //let registerUserFromWaitlist: number = -1; //boolean = false;
        //let userFromWaitlist: number = 0;

        // See if the user is on the wait list
        if (userOnWaitList) {
            btnText = "Remove From Waitlist";
            btnType = Components.ButtonTypes.OutlineDanger;
            dlg = "Removing User From Waitlist"; //if changed be sure to adjust duplicate text ref below
            iconType = personXFill;
        }
        // Else, see if the event is full and the user is not registered
        else if (eventFull && !isRegistered) {
            btnText = "Add To Waitlist";
            btnType = Components.ButtonTypes.OutlinePrimary;
            dlg = "Adding User To Waitlist"; //if changed be sure to adjust duplicate text ref below
            iconType = personPlusFill;
        }
        // Else, see if the user is registered
        else if (isRegistered) {
            btnText = "Unregister";
            btnType = Components.ButtonTypes.OutlineDanger;
            dlg = "Unregistering the User"; //if changed be sure to adjust duplicate text ref below
            iconType = calendarMinusFill;
        }
        // Else, the event is open
        else {
            btnText = "Register";
            btnType = Components.ButtonTypes.OutlinePrimary;
            dlg = "Registering the User"; //if changed be sure to adjust duplicate text ref below
            iconType = calendarPlusFill;
        }

        // Render the button
        Components.Button({
            el: this._el,
            iconType: iconType,
            iconSize: iconSize,
            text: " " + btnText,
            type: btnType,
            onClick: (button) => {
                // Display a loading dialog
                LoadingDialog.setHeader(dlg);
                LoadingDialog.setBody(dlg);
                LoadingDialog.show();

                // Check if item has already been updated by someone else
                Web().Lists(DataSource.Configuration.eventList).getItemById(this._item.Id).query({ //was Strings Event
                    //Expand: ["Editor", "AttachmentFiles", "POC", "RegisteredUsers", "WaitListedUsers"],
                    //GetAllItems: true,
                    //OrderBy: ["StartDate asc"],
                    //Top: 5000,
                    Select: ["Title", "Description", "POCId", "Location", "Capacity", "OpenSpots", "RegisteredUsersId", "WaitListedUsersId", "Modified"] //"*", "IsCancelled", "RegistrationClosed"
                }).execute(
                    // Success
                    items => {
                        if ((items as IEventItem).Modified != this._item.Modified) {
                            // Check for changes/conditions that are OK to just proceed with the update
                            if (((items as IEventItem).Title != this._item.Title ||
                                    (items as IEventItem).Description != this._item.Description ||
                                    (items as IEventItem).POCId != this._item.POCId ||
                                    (items as IEventItem).Location != this._item.Location ||
                                    (items as IEventItem).RegisteredUsersId != this._item.RegisteredUsersId ||
                                    (items as IEventItem).WaitListedUsersId != this._item.WaitListedUsersId) &&
                                (items as IEventItem).Capacity === this._item.Capacity && //Capacity increase has more effects (user will be registered vs waitlisted and is checked earlier/above)
                                ((dlg === "Registering the User" && (items as IEventItem).Capacity > (items as IEventItem).RegisteredUsersId?.results.length) || //still needs to be room available
                                    (dlg === "Adding User To Waitlist" && (items as IEventItem).Capacity <= (items as IEventItem).RegisteredUsersId?.results.length) ||
                                    dlg === "Unregistering the User" || 
                                    dlg === "Removing User From Waitlist")) {
                                // Update internal saved data
                                this._item.RegisteredUsersId = (items as IEventItem).RegisteredUsersId;
                                this._item.WaitListedUsersId = (items as IEventItem).WaitListedUsersId;
                                eventFull = Registration.isFull(this._item);
                                isRegistered = this._item.RegisteredUsersId ? this._item.RegisteredUsersId.results.indexOf(ContextInfo.userId) >= 0 : false;
                                userOnWaitList = this._item.WaitListedUsersId ? this._item.WaitListedUsersId.results.indexOf(ContextInfo.userId) >= 0 : false;
                                //this._item.OpenSpots = (items as IEventItem).OpenSpots; //not even changing anyway

                                // Final checks to see if current user has already performed the action (such as in another browser)
                                if (dlg == "Registering the User" && isRegistered || dlg == "Adding User To Waitlist" && userOnWaitList ||
                                    dlg === "Unregistering the User" && !isRegistered || dlg === "Removing User From Waitlist" && !userOnWaitList) {
                                    // Refresh the dashboard
                                    this._onRefresh();
                                    return;
                                }

                                // Do the update regardless that a change had been prior made
                                updateItem();
                                return;
                            }
                            
                            // Refresh the dashboard to get current data and ask user to "try again"
                            this._onRefresh();

                            Modal.clear();

                            // Set the header
                            Modal.setHeader("Whoops!");

                            // Set the body
                            Modal.setBody("Someone else just made a change to the event. Please try again.");

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
                        }
                        else // No one updated the item before the current user
                            updateItem();
                    },
                    // Error
                    (error) => { 
                        //Couldn't check for some reason
                        if (console) console.log(error);
                    }
                );
                
                const updateItem = () => {
                    let waitListedUserIds = this._item.WaitListedUsersId ? this._item.WaitListedUsersId.results : [];
                    let registeredUserIds = this._item.RegisteredUsersId ? this._item.RegisteredUsersId.results : [];
                    let userFromWaitlist: number = 0;
                    //const userIsRegistering = btnText == "Register";
                    const userIsRegistering = dlg == "Registering the User";
                    //const userIsWaitlisted = (eventFull && !isRegistered && btnText == "Add To Waitlist");
                    const userIsWaitlisting = dlg == "Adding User To Waitlist";

                    // The metadata to be updated
                    let updateFields = {};

                    // See if the user is on the wait list
                    if (userOnWaitList) {
                        // Remove the user from the waitlist
                        let userIdx = waitListedUserIds.indexOf(userID);
                        waitListedUserIds.splice(userIdx, 1);

                        // Set the metadata
                        updateFields = {
                            WaitListedUsersId: { results: waitListedUserIds },
                        };

                        Registration.findUserRegistrationAndDelete(this._item, userID);
                    }
                    // Else, see if the event is full and the user is not registered
                    else if (eventFull && !isRegistered) {
                        // Add the user to the waitlist
                        waitListedUserIds.push(ContextInfo.userId);

                        // Set the metadata
                        updateFields = {
                            WaitListedUsersId: { results: waitListedUserIds },
                        };

                        Registration.addUserRegistration(this._item, ContextInfo.userId, "Waitlist");
                    }
                    // Else, see if the user is already registered
                    else if (isRegistered) {
                        // Get the user ids
                        let userIdx = registeredUserIds.indexOf(
                            ContextInfo.userId
                        );

                        // Remove the user
                        registeredUserIds.splice(userIdx, 1);
                        Registration.findUserRegistrationAndDelete(this._item, ContextInfo.userId);

                        //if the event was full, add the next waitlist user
                        if (eventFull && waitListedUserIds.length > 0) {
                            // Set the index
                            userFromWaitlist = waitListedUserIds[0];
                            //let idx = waitListedUserIds.indexOf(userFromWaitlist);

                            // Remove from waitlist
                            waitListedUserIds.splice(0, 1); //0 was idx but not needed

                            // Add to registered users
                            registeredUserIds.push(userFromWaitlist);
                            //registerUserFromWaitlist = userFromWaitlist; ?????

                            Registration.setUserFromWaitlistToRegistered(this._item, userFromWaitlist);
                        }

                        // Set the metadata
                        updateFields = {
                            OpenSpots: this._item.OpenSpots + 1,
                            RegisteredUsersId: { results: registeredUserIds },
                            WaitListedUsersId: { results: waitListedUserIds },
                        };
                    }
                    // Else, the event is open
                    else {
                        // Add the user
                        registeredUserIds.push(ContextInfo.userId);

                        // Set the metadata
                        updateFields = {
                            OpenSpots: this._item.OpenSpots - 1,
                            RegisteredUsersId: { results: registeredUserIds },
                        };

                        Registration.addUserRegistration(this._item, ContextInfo.userId, "Registered");
                    }

                    // Update the item
                    this._item.update(updateFields).execute(
                        // Success
                        () => {
                            // Send an email if a waitlisted user is now registered
                            if (userFromWaitlist)
                                //No longer able to send email due to API deprecation
                                //Registration.sendMail(this._item, userFromWaitlist, false, true, true);

                            //No longer able to send email due to API deprecation
                            // Send email for current user
                            // Registration.sendMail(this._item, 0, userIsRegistering, userIsWaitlisting).then(() => {
                            //     // Hide the dialog
                            //     LoadingDialog.hide();

                            //     // Refresh the dashboard
                            //     this._onRefresh();
                            // });
                            
                            //Hide the dialog
                            LoadingDialog.hide();

                            // Refresh the dashboard
                            this._onRefresh();
                        },
                        // Error
                        (error) => {
                            if (console) console.log(error);
                            //error.requestType: 31
                            //error.response: "{\"error\":{\"code\":\"-2130575252...
                            //error.status == 403
                            //error.xhr: XHRRequest (then .xhr again for the XMLHttpRequest)
                            let errorObj = null;
                            let errorMsg = "";
                            try {
                                errorObj = JSON.parse(error.response)
                            }
                            catch (e) {}
                            if (errorObj) {
                                if (errorObj.error.code == "-2130575252, Microsoft.SharePoint.SPException")
                                    //errorObj.error.message.value == "The security validation for this page is invalid and might be corrupted. Please use your web browser's Back button to try your operation again."
                                    errorMsg = "The security validation for this page has expired. Please refresh the page and try again.";
                                else
                                    errorMsg = errorObj.error.message?.value;
                            }
                            else { //Response was not a JSON obj
                                errorMsg = "An HTTP " + error.status.toString() + " error was received.";
                                if (error.response && error.response.indexOf("<html") != -1)
                                    errorMsg += "<br />" + error.response;
                            }
                            
                            LoadingDialog.hide();
                            
                            Modal.clear();
                            Modal.setHeader("Error occurred");
                            Modal.setBody(errorMsg);
                            Modal.setType(Components.ModalTypes.Medium);
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
                            Modal.show();
                        }
                    );
                }
            }
        });
    }

    //No longer able to send email due to API deprecation
    // Sends an email
    static sendMail(event: IEventItem, userId: number, userIsRegistering: boolean, userIsWaitlisted: boolean, addingFromWaitlist?: boolean): PromiseLike<void> {
        // Return a promise
        return new Promise((resolve) => {
            // Do nothing if the user is unregistering from the event
            // if (!userIsRegistering) { resolve(); return; }
            console.log("userIsWaitlisted: " + userIsWaitlisted);
            const waitlistText = addingFromWaitlist ? "from" : "to";

            // Get the user email
            Registration.getUserEmail(userId).then(userEmail => {
                // Set the body of the email
                let body = `You have ${userIsRegistering ? "successfully registered for" : (userIsWaitlisted ? `successfully been added ${waitlistText} the waitlist for` : "been unregistered from")} the following event:</br>
                    <p><strong>Title: </strong></p><p style="text-indent:10px;">${event.Title}</p>
                    <p><strong>Description: </strong></p><p style="text-indent:10px;">${event.Description}</p>
                    <p><strong>Start Date: </strong></p><p style="text-indent:10px;">${moment(event.StartDate).format("MM-DD-YYYY HH:mm A")}</p>
                    <p><strong>End Date: </strong></p><p style="text-indent:10px;">${moment(event.EndDate).format("MM-DD-YYYY HH:mm A")}</p>
                    <p><strong>Location: </strong></p><p style="text-indent:10px;">${event.Location}</p>`;
                
                // Set the subject
                //let subject = `Successfully ${userIsWaitlisted ? "added from the waitlist" : (userIsRegistering ? "registered" : "removed from")} for the event: ${event.Title}`;
                const subject = `Successfully ${userIsRegistering ? "registered for" : (userIsWaitlisted ? `added ${waitlistText} the waitlist for` : "unregistered from" )} the event: ${event.Title}`;

                // See if the user email exists and is registering for the event
                if (userEmail) {
                    // Send the email
                    Utility().sendEmail({
                        To: [userEmail],
                        Subject: subject,
                        Body: body,
                    }).execute(
                        () => {
                            console.log("Successfully sent email");
                            resolve();
                        },
                        () => {
                            console.error("Error sending email");
                            resolve();
                        }
                    );
                } else {
                    // Resolve the request
                    resolve();
                }
            });
        });
    }
}