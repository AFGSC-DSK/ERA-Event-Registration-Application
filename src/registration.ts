import { LoadingDialog, Modal } from "dattatable";
import { Components, ContextInfo, Helper, List, Utility, Web } from "gd-sprest-bs";
import { IEventItem } from "./ds";
import * as moment from "moment";
import { calendarPlusFill } from "gd-sprest-bs/build/icons/svgs/calendarPlusFill"
import { calendarMinusFill } from "gd-sprest-bs/build/icons/svgs/calendarMinusFill"
import { personPlusFill } from "gd-sprest-bs/build/icons/svgs/personPlusFill";
import { personXFill } from "gd-sprest-bs/build/icons/svgs/personXFill";
import Strings from "./strings";
//import { Modal } from "gd-bs/src/components/components";

/**
 * Registration Button
 */
export class Registration {
    private _el: HTMLElement = null;
    private _item: IEventItem = null;
    private _readyUser: String[] = [];
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

    // Gets the user email
    static getUserEmail(userFromWaitlist: number): PromiseLike<string> {
        // Return a promise
        return new Promise((resolve) => {
            // See if the user is from the wait list
            if (userFromWaitlist > 0) {
                // Get the user
                Web().getUserById(userFromWaitlist).execute(user => {
                    // Resolve the promise
                    resolve(user.Email);
                });
            } else {
                // Resolve the promise
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
        let capacity: number = event.Capacity ? (parseInt(event.Capacity) as number) : 0;
        return numUsers == capacity ? true : false;
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
        let registerUserFromWaitlist: boolean = false;
        let userFromWaitlist: number = 0;

        // See if the user is on the wait list
        if (userOnWaitList) {
            btnText = "Remove From Waitlist";
            btnType = Components.ButtonTypes.OutlineDanger;
            dlg = "Removing User From Waitlist";
            iconType = personXFill;
        }
        // Else, see if the event is full and the user is not registered
        else if (eventFull && !isRegistered) {
            btnText = "Add To Waitlist";
            btnType = Components.ButtonTypes.OutlinePrimary;
            dlg = "Adding User To Waitlist";
            iconType = personPlusFill;
        }
        // Else, see if the user is registered
        else if (isRegistered) {
            btnText = "Unregister";
            btnType = Components.ButtonTypes.OutlineDanger;
            dlg = "Unregistering the User";
            iconType = calendarMinusFill;
        }
        // Else, the event is open
        else {
            btnText = "Register";
            btnType = Components.ButtonTypes.OutlinePrimary;
            dlg = "Registering the User";
            iconType = calendarPlusFill;
        }

        // Render the tooltip
        Components.Tooltip({
            el: this._el,
            content: btnText,
            btnProps: {
                iconType: iconType,
                iconSize: iconSize,
                text: " " + btnText,
                type: btnType,
                onClick: (button) => {
                    if (!isRegistered) {
                        console.log("this is what's in isRegistered: " + isRegistered);
                        // TO-DO upload a document to the 'Required Docs' library
                        Modal.setHeader(ContextInfo.userDisplayName);

                        let elContainer = document.createElement("div");
                        // Upload Button
                        Components.Button({
                            el: elContainer,
                            text: "Upload a Document",
                            type: Components.ButtonTypes.OutlineDark,
                            // isLarge: true,
                            onClick: (ev, item) => {
                                // Show the file upload dialog
                                Helper.ListForm.showFileDialog().then(fileInfo => {
                                    // Upload the file
                                    List(Strings.Lists.Templates).RootFolder().Files().add(fileInfo.name, true, fileInfo.data).execute(
                                        // Success
                                        file => {
                                            this._readyUser.push(ContextInfo.userLoginName);
                                            alert("File successfully uploaded! Please Register to confirm enrollment.");
                                        },
                                        // Error 
                                        err => {
                                            alert("Error uploading file");
                                        }
                                    )
                                }
                                )
                            }
                        });

                        Modal.setBody(elContainer);

                        Modal.setFooter(Components.ButtonGroup({
                            buttons: [
                                {
                                    text: "Register",
                                    type: Components.ButtonTypes.Primary,
                                    onClick: () => {
                                        // "has-uploaded-documents" flag
                                        let hasUploaded: boolean = false;

                                        // Check if the current user has uploaded any documents
                                        for (let i = 0; i < this._readyUser.length; i++) {
                                            if (this._readyUser[i] === ContextInfo.userLoginName) {
                                                hasUploaded = true;
                                            }
                                        }

                                        // See if the user has uploaded required docs
                                        if (hasUploaded) {
                                            Modal.hide();

                                            let waitListedUserIds = this._item.WaitListedUsersId ? this._item.WaitListedUsersId.results : [];
                                            let registeredUserIds = this._item.RegisteredUsersId ? this._item.RegisteredUsersId.results : [];

                                            // See if the user is unregistered
                                            let isUnregistered = btnText == "Unregister";
                                            let userIsRegistering = btnText == "Register";

                                            // Display a loading dialog
                                            LoadingDialog.setHeader(dlg);
                                            LoadingDialog.setBody(dlg);
                                            LoadingDialog.show();

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
                                            }
                                            // Else, see if the event is full and the user is not registered
                                            else if (eventFull && !isRegistered) {
                                                // Add the user to the waitlist
                                                waitListedUserIds.push(ContextInfo.userId);

                                                // Set the metadata
                                                updateFields = {
                                                    WaitListedUsersId: { results: waitListedUserIds },
                                                };
                                            }
                                            // Else, see if the user is registered
                                            else if (isRegistered) {
                                                // Get the user ids
                                                let userIdx = registeredUserIds.indexOf(
                                                    ContextInfo.userId
                                                );

                                                // Remove the user
                                                registeredUserIds.splice(userIdx, 1);

                                                //if the event was full, add the next waitlist user
                                                if (eventFull && waitListedUserIds.length > 0) {
                                                    // Set the index
                                                    userFromWaitlist = waitListedUserIds[0];
                                                    let idx = waitListedUserIds.indexOf(userFromWaitlist);

                                                    // Remove from waitlist
                                                    waitListedUserIds.splice(idx, 1);

                                                    // Add to registered users
                                                    registeredUserIds.push(userFromWaitlist);
                                                    registerUserFromWaitlist = true;
                                                }

                                                // Set the metadata
                                                updateFields = {
                                                    OpenSpots: parseInt(this._item.OpenSpots) + 1,
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
                                                    OpenSpots: parseInt(this._item.OpenSpots) - 1,
                                                    RegisteredUsersId: { results: registeredUserIds },
                                                };
                                            }

                                            // Update the item
                                            this._item.update(updateFields).execute(
                                                // Success
                                                () => {
                                                    // Send email
                                                    Registration.sendMail(this._item, userFromWaitlist, userIsRegistering, false).then(() => {
                                                        // Hide the dialog
                                                        LoadingDialog.hide();

                                                        // Refresh the dashboard
                                                        this._onRefresh();
                                                    });
                                                },
                                                // Error
                                                () => {
                                                    // TODO
                                                }
                                            );
                                        }
                                        // Else, the user has not uploaded required docs
                                        else {
                                            // Notify the user to upload before registering
                                            alert("UPLOAD REQUIRED DOCS FIRST!");
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

                        // Modal Properties
                        Modal.setType(Components.ModalTypes.XLarge);

                        // Display the modal
                        Modal.show();
                    }
                    else {
                        console.log("this is what's in isRegistered: " + isRegistered);
                        let waitListedUserIds = this._item.WaitListedUsersId ? this._item.WaitListedUsersId.results : [];
                        let registeredUserIds = this._item.RegisteredUsersId ? this._item.RegisteredUsersId.results : [];

                        // See if the user is unregistered
                        let isUnregistered = btnText == "Unregister";
                        let userIsRegistering = btnText == "Register";

                        // Display a loading dialog
                        LoadingDialog.setHeader(dlg);
                        LoadingDialog.setBody(dlg);
                        LoadingDialog.show();

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
                        }
                        // Else, see if the event is full and the user is not registered
                        else if (eventFull && !isRegistered) {
                            // Add the user to the waitlist
                            waitListedUserIds.push(ContextInfo.userId);

                            // Set the metadata
                            updateFields = {
                                WaitListedUsersId: { results: waitListedUserIds },
                            };
                        }
                        // Else, see if the user is registered
                        else if (isRegistered) {
                            // Get the user ids
                            let userIdx = registeredUserIds.indexOf(
                                ContextInfo.userId
                            );

                            // Remove the user
                            registeredUserIds.splice(userIdx, 1);

                            //if the event was full, add the next waitlist user
                            if (eventFull && waitListedUserIds.length > 0) {
                                // Set the index
                                userFromWaitlist = waitListedUserIds[0];
                                let idx = waitListedUserIds.indexOf(userFromWaitlist);

                                // Remove from waitlist
                                waitListedUserIds.splice(idx, 1);

                                // Add to registered users
                                registeredUserIds.push(userFromWaitlist);
                                registerUserFromWaitlist = true;
                            }

                            // Set the metadata
                            updateFields = {
                                OpenSpots: parseInt(this._item.OpenSpots) + 1,
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
                                OpenSpots: parseInt(this._item.OpenSpots) - 1,
                                RegisteredUsersId: { results: registeredUserIds },
                            };
                        }

                        // Update the item
                        this._item.update(updateFields).execute(
                            // Success
                            () => {
                                // Send email
                                Registration.sendMail(this._item, userFromWaitlist, userIsRegistering, false).then(() => {
                                    // Hide the dialog
                                    LoadingDialog.hide();

                                    // Refresh the dashboard
                                    this._onRefresh();
                                });
                            },
                            // Error
                            () => {
                                // TODO
                            }
                        );
                    }

                }
            }
        });
    }

    // Sends an email
    static sendMail(event: IEventItem, userId: number, userIsRegistering: boolean, userIsWaitlisted: boolean): PromiseLike<void> {
        // Return a promise
        return new Promise((resolve) => {
            // Do nothing if the user is unregistering from the event
            if (!userIsRegistering) { resolve(); return; }

            // Get the user email
            Registration.getUserEmail(userId).then(userEmail => {
                // Set the body of the email
                let body = `${ContextInfo.userDisplayName}, you have ${userIsRegistering ? "successfully registered for" : (userIsWaitlisted ? "successfully been added from the waitlist for" : "been removed from")} the following event:
                    <p><strong>Title:</strong>${event.Title}</p></br>
                    <p><strong>Description:</strong>${event.Description}</p></br>
                    <p><strong>Start Date:</strong>${moment(event.StartDate).format("MMMM DD, YYYY HH:MM A")}</p></br>
                    <p><strong>End Date:</strong>${moment(event.EndDate).format("MMMM DD, YYYY HH:MM A")}</p></br>
                    <p><strong>Location:</strong>${event.Location}</p></br>
                    <p><strong>Point of Contact:</strong>${event.POCId}`;
                    

                // Set the subject
                let subject = `${userId > 0 ? "Added from the waitlist" : "Registered"} for the event: ${event.Title}`;

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