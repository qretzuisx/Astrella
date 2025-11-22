import logo from "./logo.svg";
import search_icon from "./search_icon.svg"
import size_icon from "./size_icon.svg"
import fabric_icon from "./fabric_icon.svg"
import event_icon from "./event_icon.svg"
import color_icon from "./color_icon.svg"
import addIcon from "./addIcon.svg"
import gownIcon from "./gownIcon.svg"
import gownIconColored from "./gownIconColored.svg"
import dashboardIcon from "./dashboardIcon.svg"
import dashboardIconColored from "./dashboardIconColored.svg"
import addIconColored from "./addIconColored.svg"
import listIcon from "./listIcon.svg"
import listIconColored from "./listIconColored.svg"
import cautionIconColored from "./cautionIconColored.svg"
import arrow_icon from "./arrow_icon.svg"
import check_icon from "./check_icon.svg"
import tick_icon from "./tick_icon.svg"
import delete_icon from "./delete_icon.svg"
import eye_icon from "./eye_icon.svg"
import eye_close_icon from "./eye_close_icon.svg"
import filter_icon from "./filter_icon.svg"
import edit_icon from "./edit_icon.svg"
import calendar_icon_colored from "./calendar_icon_colored.svg"
import location_icon_colored from "./location_icon_colored.svg"
import main_ai from "./main_ai.png"
import upload_icon from "./upload_icon.svg"


// AI RECCOMENDATION LIST
export const eventTypeList = ['Wedding', 'Traditional', 'Prom', 'Formal']
export const bodyTypeList = ['Hourglass', 'Pear', 'Rectangle', 'Diamond']
export const skinToneList = ['Warm', 'Cold', 'Neutral']
export const heightList = ['Small', 'Medium', 'Tall']
export const faceShapeList = ['Oval', 'Square', 'Round', 'Heart', 'Diamond']

export const assets = {
    logo,
    search_icon,
    size_icon,
    edit_icon,
    fabric_icon,
    event_icon,
    color_icon,
    addIcon,
    gownIcon,
    gownIconColored,
    dashboardIcon,
    dashboardIconColored,
    addIconColored,
    listIcon,
    listIconColored,
    cautionIconColored,
    calendar_icon_colored,
    location_icon_colored,
    arrow_icon,
    check_icon,
    tick_icon,
    delete_icon,
    eye_icon,
    eye_close_icon,
    filter_icon,
    main_ai,
    upload_icon,
}

export const menuLinks = [
    { name: "Home", path: "/" },
    { name: "Gowns", path: "/gowns" },
    { name: "My Bookings", path: "/my-bookings" },
]

export const ownerMenuLinks = [
    { name: "Dashboard", path: "/owner", icon: dashboardIcon, coloredIcon: dashboardIconColored },
    { name: "Add gown", path: "/owner/add-gown", icon: addIcon, coloredIcon: addIconColored },
    { name: "Manage Gowns", path: "/owner/manage-gown", icon: gownIcon, coloredIcon: gownIconColored },
    { name: "Manage Bookings", path: "/owner/manage-bookings", icon: listIcon, coloredIcon: listIconColored },
]
