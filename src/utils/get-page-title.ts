import { title } from "@/vars";

function getPageTitle(str?: string | string[]) {
    if (typeof str === "undefined") str = [];
    if (typeof str === "string") str = [str];
    str.push(title);
    return [...new Set(str)].filter(Boolean).join(" / ");
}

export default getPageTitle;
