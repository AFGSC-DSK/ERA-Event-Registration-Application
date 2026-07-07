import { Components, ContextInfo, List, Types, Web } from "gd-sprest-bs";
import * as moment from "moment";
import Strings from "./strings";

// Event Item
export interface IEventItem extends Types.SP.ListItemOData {
    Description: string;
    StartDate: string;
    EndDate: string;
    EventStatus: { results: string };
    IsCancelled: boolean;
    RegistrationClosed: boolean;
    Location: string;
    OpenSpots: number;
    Capacity: number;
    CreatedBy: string;
    Modified: string;
    Editor: { Id: number, Title: string };
    POC: {
        results: {
            EMail: string;
            Id: number;
            Title: string;
        }[]
    };
    POCId: { results: number[] };
    RegisteredUsers: {
        results: {
            EMail: string;
            Id: number;
            Title: string;
        }[]
    };
    RegisteredUsersId: { results: number[] };
    WaitListedUsers: {
        results: {
            EMail: string;
            Id: number;
            Title: string;
        }[]
    };
    WaitListedUsersId: { results: number[] };
}

// Configuration
export interface IConfiguration {
    adminGroupName?: string;
    headerImage?: string;
    headerTitle?: string;
    hideAddToCalendarColumn?: boolean;
    hideHeader?: boolean;
    hideImage?: boolean;
    membersGroupName?: string;
    eventList?: string;
    userRegistrationList?: string;
    userRegistrationEventField?: string;
    userRegistrationEventType?: string;
}
/**
 * Data Source
 */
export class DataSource {
    // Filter Set
    private static _filterSet: boolean = false;
    static get FilterSet(): boolean { return this._filterSet; }
    static SetFilter(filterSet: boolean) {
        this._filterSet = filterSet;
    }

    // Events
    private static _events: IEventItem[] = null;
    static get Events(): IEventItem[] { return this._events; }
    static get ActiveEvents(): IEventItem[] {
        let activeEvents: IEventItem[] = [];
        this._events.forEach((event) => {
            let startDate = event.StartDate;
                              
            // Determine the # of hours until the event starts
            let currDate = moment();
            let begDate = moment(startDate);
            let resetHour = '12:00:00 am';
            let time = moment(resetHour, 'HH:mm:ss a');
            let currReset = currDate.set({ hour: time.get('hour'), minute: time.get('minute') });
            let begReset = begDate.set({ hour: time.get('hour'), minute: time.get('minute') });
            let dateDiff = moment(begReset, "DD/MM/YYYY").diff(moment(currReset, "DD/MM/YYYY"), "hours");

            // Determine if the # of hours until the event starts is within 1 day or if it is within 24 hours of current time
            if (dateDiff > 24 || (dateDiff <= 24 && dateDiff > 0)) {
                activeEvents.push(event);
            }
        })
        return activeEvents;
    }
    static get InactiveEvents(): IEventItem[] {
        let inactiveEvents: IEventItem[] = [];
        this._events.forEach((event) => {
            let startDate = event.StartDate;
         
            // Determine the # of hours until the event starts
            let currDate = moment();
            let begDate = moment(startDate);
            let resetHour = '12:00:00 am';
            let time = moment(resetHour, 'HH:mm:ss a');
            let currReset = currDate.set({ hour: time.get('hour'), minute: time.get('minute') });
            let begReset = begDate.set({ hour: time.get('hour'), minute: time.get('minute') });
            let dateDiff = moment(begReset, "DD/MM/YYYY").diff(moment(currReset, "DD/MM/YYYY"), "hours");

            // Determine if the Event takes place before 24 hours before the start date
            if (dateDiff <= 24 && dateDiff <= 0) {
                inactiveEvents.push(event);
            }
        })
        return inactiveEvents;
    }

    static loadEvents(): PromiseLike<void> {
        // Return a promise
        return new Promise((resolve, reject) => {
            let web = Web();

            // Load the data
            if (this._isAdmin) {
                web.Lists(DataSource.Configuration.eventList).Items().query({ //was String Events
                    Expand: ["Editor", "AttachmentFiles", "POC", "RegisteredUsers", "WaitListedUsers"],
                    GetAllItems: true,
                    OrderBy: ["StartDate asc"],
                    Top: 5000,
                    Select: [
                        "*", "POC/Id", "POC/Title", "POC/EMail",
                        "RegisteredUsers/Id", "RegisteredUsers/Title", //"RegisteredUsers/EMail",
                        "WaitListedUsers/Id", "WaitListedUsers/Title", //"WaitListedUsers/EMail",
                        "Editor/Id", "Editor/Title",
                    ]
                }).execute(
                    // Success
                    items => {
                        // Resolve the request
                        this._events = items.results as any;
                    },
                    // Error
                    () => { reject(); }
                );
            }
            else {
                let today = moment().toISOString();
                web.Lists(DataSource.Configuration.eventList).Items().query({ //was String Events
                    Expand: ["AttachmentFiles", "POC", "RegisteredUsers", "WaitListedUsers"],
                    Filter: `StartDate ge '${today}'`,
                    GetAllItems: true,
                    OrderBy: ["StartDate asc"],
                    Top: 5000,
                    Select: [
                        "*", "POC/Id", "POC/Title",
                        "RegisteredUsers/Id", "RegisteredUsers/Title", //"RegisteredUsers/EMail",
                        "WaitListedUsers/Id", "WaitListedUsers/Title", //"WaitListedUsers/EMail"
                    ]
                }).execute(
                    items => {
                        // Resolve the request
                        this._events = items.results as any;
                    },
                    () => { reject(); }
                );
            }
            // Load the user permissions for the Events list
            web.Lists(DataSource.Configuration.eventList).getUserEffectivePermissions(this._userLoginName).execute(perm => { //was String Events
                // Save the user permissions
                this._eventRegPerms = perm.GetUserEffectivePermissions;
            }, () => {
                // Unable to determine the user permissions
                this._eventRegPerms = {};
            });

            // Once both queries are complete, return promise
            web.done(() => {
                // Resolve the request
                resolve();
            });
        });
    }

    // Event Registration Permissions
    private static _eventRegPerms: Types.SP.BasePermissions;
    static get EventRegPerms(): Types.SP.BasePermissions { return this._eventRegPerms; };

    // Check if user is an admin
    private static _isAdmin: boolean = false;
    static get IsAdmin(): boolean { return this._isAdmin; }

    // Set Admin status
    private static GetAdminStatus(): PromiseLike<void> {
        return new Promise((resolve) => {
            if (this._cfg.adminGroupName) {
                Web().SiteGroups().getByName(this._cfg.adminGroupName).Users().getById(ContextInfo.userId).execute(
                    () => { this._isAdmin = true; resolve(); },
                    () => { this._isAdmin = false; resolve(); }
                )
            }
            else {
                Web().AssociatedOwnerGroup().Users().getById(ContextInfo.userId).execute(
                    () => { this._isAdmin = true; resolve(); },
                    () => { this._isAdmin = false; resolve(); }
                )
            }
        });
    }

    static get StatusFilters(): Components.ICheckboxGroupItem[] { 
        let items: Components.ICheckboxGroupItem[] = [];

        let values: string[] = ["Inactive Events", "All Events"];

        for(let i = 0; i < values.length; i++) {
            let value = values[i];

            items.push({
                label: value,
                type: Components.CheckboxGroupTypes.Switch,
                isSelected: value === "Active Events" ? true : false
            });
        }   

        return items;
    }

    // User Login Name
    private static _userLoginName = null;
    static get UserLoginName(): string { return this._userLoginName; }
    private static loadUserName(): PromiseLike<void> {
        // Return a promise
        return new Promise((resolve, reject) => {
            // Get the user information
            Web().CurrentUser().execute(user => {
                // Set the login name
                this._userLoginName = user.LoginName;

                // Resolve the request
                resolve();
            }, reject);
        });
    }

    // Loads the list data
    static init(): PromiseLike<void> {
        // Return a promise
        return new Promise((resolve, reject) => {
            // Load the optional configuration file
            this.loadConfiguration().then(() => {
                // Load the user's login name
                this.loadUserName().then(() => {
                    // Load the security group urls
                    this.loadSecurityGroupUrls().then(() => {
                        // Determine if the user is an admin
                        this.GetAdminStatus().then(() => {
                            // Load the events
                            this.loadEvents().then(() => {
                                resolve();
                            }, reject);
                        }, reject);
                    }, reject);
                }, reject);
            }, reject);
        });
    }

    // Configuration
    private static _cfg: IConfiguration = null;
    static get Configuration(): IConfiguration { return this._cfg; }
    static loadConfiguration(): PromiseLike<void> {
        // Return a promise
        return new Promise(resolve => {
            // Get the current web
            Web().getFileByServerRelativeUrl(Strings.EventRegConfig).content().execute(
                // Success
                file => {
                    // Convert the string to a json object
                    let cfg = null;
                    try { cfg = JSON.parse(String.fromCharCode.apply(null, new Uint8Array(file))); }
                    catch { cfg = {}; }

                    // Set the configuration
                    this._cfg = cfg;
                    if (this._cfg.eventList == null)
                        this._cfg.eventList = Strings.Lists.Events;

                    // Resolve the request
                    resolve();
                },

                // Error
                () => {
                    // Set the configuration to nothing
                    this._cfg = {} as any;

                    // Resolve the request
                    resolve();
                }
            );
        });
    }

    // Security Groups
    private static _managerId: number = null;
    static get ManagersUrl(): string { return ContextInfo.webServerRelativeUrl + "/_layouts/15/people.aspx?MembershipGroupId=" + this._managerId; };
    private static _memberId: number = null;
    static get MembersUrl(): string { return ContextInfo.webServerRelativeUrl + "/_layouts/15/people.aspx?MembershipGroupId=" + this._memberId; };
    static get ListUrl(): string { return ContextInfo.webServerRelativeUrl + "/Lists/" + this.Configuration.eventList.replace(/ /g, '') };
    static loadSecurityGroupUrls(): PromiseLike<void> {
        return new Promise((resolve) => {
            let web = Web();

            // Load the owner's group
            let ownersGroup = DataSource.Configuration.adminGroupName;
            (ownersGroup ? Web().SiteGroups().getByName(ownersGroup) : Web().AssociatedOwnerGroup()).execute(group => {
                // Set the id
                this._managerId = group.Id;
            });

            // Load the member's group
            let membersGroup = DataSource.Configuration.membersGroupName;
            (membersGroup ? Web().SiteGroups().getByName(membersGroup) : Web().AssociatedMemberGroup()).execute(group => {
                // Set the id
                this._memberId = group.Id;
            });
                
            // Wait for the requests to complete
            web.done(() => { resolve(); });
        });
    }
}