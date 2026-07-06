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
import edit_profile_icon from "./edit_profile_icon.svg"
import calendar_icon_colored from "./calendar_icon_colored.svg"
import location_icon_colored from "./location_icon_colored.svg"
import home_bg from "./home-bg.png"
import upload_icon from "./upload_icon.svg"
import gcash_qr from "./gcash-qr.png"
import apparel_bg from "./apparel-bg.png"
import star_gold from "./star-gold.svg"
import star_blue from "./star-blue.svg"
import star_green from "./star-green.svg"


// AI RECCOMENDATION LIST
export const eventTypeList = ['Wedding', 'Traditional', 'Prom', 'Formal', 'Themed']
export const bodyTypeList = ['Hourglass', 'Pear', 'Rectangle', 'Diamond', 'Inverted Triangle', 'Trapezoid', 'Oval']
export const skinToneList = ['Warm', 'Cool', 'Neutral']
export const faceShapeList = ['Oval', 'Square', 'Round', 'Heart', 'Diamond', 'Long']

export const assets = {
    logo,
    search_icon,
    size_icon,
    edit_profile_icon,
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
    upload_icon,
    home_bg,
    gcash_qr,
    apparel_bg,
    star_gold,
    star_blue,
    star_green,
}

export const menuLinks = [
    { name: "Home", path: "/" },
    { name: "Apparel", path: "/gowns" },
    { name: "My Bookings", path: "/my-bookings" },
]

export const ownerMenuLinks = [
    { name: "Dashboard", path: "/owner", icon: dashboardIcon, coloredIcon: dashboardIconColored },
    { name: "Shop Profile", path: "/owner/shop-profile", icon: edit_profile_icon, coloredIcon: edit_profile_icon },
    { name: "Add Apparel", path: "/owner/add-gown", icon: addIcon, coloredIcon: addIconColored },
    { name: "Manage Apparel", path: "/owner/manage-gown", icon: gownIcon, coloredIcon: gownIconColored },
    { name: "Manage Bookings", path: "/owner/manage-bookings", icon: listIcon, coloredIcon: listIconColored },
]
