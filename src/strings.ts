import { ContextInfo } from "gd-sprest-bs";

/**
 * Global Constants
 */

// Updates the strings for SPFx
export const setContext = (context) => {
    // Set the page context
    ContextInfo.setPageContext(context);

    // Update the values
    Strings.EventRegConfig = ContextInfo.webServerRelativeUrl + "/SiteAssets/Event-Registration/eventreg-config.json";
    Strings.SourceUrl = ContextInfo.webServerRelativeUrl + "/SiteAssets/Event-Registration/";
    Strings.SolutionUrl = ContextInfo.webServerRelativeUrl + "/SiteAssets/Event-Registration/index.html";
}

// Strings
const Strings = {
    AppElementId: "event-registration",
    GlobalVariable: "EventRegistration",
    Lists: {
        Events: "Events"
    },
    ProjectName: "Event Registration",
    ProjectDescription: "Allows users to sign up for events.",
    EventRegConfig: ContextInfo.webServerRelativeUrl + "/SiteAssets/Event-Registration/eventreg-config.json",
    SourceUrl: ContextInfo.webServerRelativeUrl + "/SiteAssets/Event-Registration/",
    SolutionUrl: ContextInfo.webServerRelativeUrl + "/SiteAssets/Event-Registration/index.html",
    //background: "https://usaf.dps.mil/sites/AFGSC-HQ/hq/ds/dsk/josh/EventReg2/SiteAssets/era.png",
    Version: "2.3",
};
export default Strings;